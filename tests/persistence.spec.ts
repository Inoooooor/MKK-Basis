import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DRAFT_KEY,
  NOTES_KEY,
  SCHEMA_VERSION,
  clearDraft,
  createDebouncedWriter,
  migrate,
  readDraft,
  readNotes,
  writeDraft,
  writeNotes,
} from '~/core/persistence'
import { makeNote } from './factories'

describe('миграции и версия схемы', () => {
  it('сохранённые данные содержат версию схемы', () => {
    writeNotes([makeNote()], localStorage)

    const raw = JSON.parse(localStorage.getItem(NOTES_KEY)!)

    expect(raw.version).toBe(SCHEMA_VERSION)
    expect(raw.notes).toHaveLength(1)
  })

  it('данные без версии читаются как схема v1', () => {
    const notes = [makeNote()]

    expect(migrate({ notes })).toEqual(notes)
  })

  it('данные новее текущей схемы не читаются вслепую', () => {
    expect(migrate({ version: SCHEMA_VERSION + 1, notes: [makeNote()] })).toEqual([])
  })

  it('битые записи отбрасываются, а не роняют разбор', () => {
    const valid = makeNote({ id: 'ok' })

    const result = migrate({
      version: SCHEMA_VERSION,
      notes: [valid, null, 'строка', { title: 'заметка без id' }, { id: '' }],
    })

    expect(result).toEqual([valid])
  })

  it('недостающие поля заметки восстанавливаются значениями по умолчанию', () => {
    const [note] = migrate({ version: SCHEMA_VERSION, notes: [{ id: 'x' }] })

    expect(note).toMatchObject({ id: 'x', title: '', todos: [] })
    expect(typeof note!.createdAt).toBe('number')
  })

  it('мусорные пункты внутри валидной заметки отбрасываются', () => {
    const [note] = migrate({
      version: SCHEMA_VERSION,
      notes: [{ id: 'x', todos: [{ id: 'a', text: 'Раз', done: 'да' }, { text: 'без id' }, 42] }],
    })

    expect(note!.todos).toEqual([{ id: 'a', text: 'Раз', done: false }])
  })
})

describe('чтение и запись хранилища', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('данные переживают перезагрузку страницы', () => {
    const notes = [makeNote({ id: 'a' }), makeNote({ id: 'b' })]

    writeNotes(notes, localStorage)

    expect(readNotes(localStorage)).toEqual(notes)
  })

  it('повреждённый JSON приводит к пустому состоянию, а не к падению', () => {
    localStorage.setItem(NOTES_KEY, '{ это не json')

    expect(readNotes(localStorage)).toEqual([])
  })

  it('пустое хранилище — пустой список', () => {
    expect(readNotes(localStorage)).toEqual([])
  })

  it('недоступное хранилище не ломает чтение и запись', () => {
    expect(readNotes(null)).toEqual([])
    expect(() => writeNotes([makeNote()], null)).not.toThrow()
  })

  it('переполнение квоты не ломает редактирование', () => {
    const storage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
      removeItem: () => {},
    } as unknown as Storage

    expect(() => writeNotes([makeNote()], storage)).not.toThrow()
  })
})

describe('черновик незавершённого редактирования', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('черновик записывается и читается вместе с идентификатором заметки', () => {
    const note = makeNote({ title: 'Не сохранено' })

    writeDraft('note-1', note, localStorage)

    const draft = readDraft(localStorage)

    expect(draft?.noteId).toBe('note-1')
    expect(draft?.note).toEqual(note)
    expect(draft?.savedAt).toBeTypeOf('number')
  })

  it('черновик чужой версии схемы игнорируется', () => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ version: 99, noteId: 'a', note: makeNote() }))

    expect(readDraft(localStorage)).toBeNull()
  })

  it('черновик без валидной заметки игнорируется', () => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      version: SCHEMA_VERSION,
      noteId: 'a',
      note: null,
    }))

    expect(readDraft(localStorage)).toBeNull()
  })

  it('очистка удаляет черновик', () => {
    writeDraft('note-1', makeNote(), localStorage)
    clearDraft(localStorage)

    expect(readDraft(localStorage)).toBeNull()
  })
})

describe('отложенная запись', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('серия изменений приводит к одной записи, а не к записи на каждое изменение', () => {
    const write = vi.fn()
    const writer = createDebouncedWriter(400, write)

    for (let change = 0; change < 20; change += 1) {
      writer.schedule()
      vi.advanceTimersByTime(50)
    }

    expect(write).not.toHaveBeenCalled()

    vi.advanceTimersByTime(400)

    expect(write).toHaveBeenCalledTimes(1)
  })

  it('flush записывает немедленно и снимает запланированную запись', () => {
    const write = vi.fn()
    const writer = createDebouncedWriter(400, write)

    writer.schedule()
    expect(writer.pending).toBe(true)

    writer.flush()

    expect(write).toHaveBeenCalledTimes(1)
    expect(writer.pending).toBe(false)

    vi.advanceTimersByTime(1000)

    expect(write).toHaveBeenCalledTimes(1)
  })

  it('flush без запланированной записи ничего не делает', () => {
    const write = vi.fn()

    createDebouncedWriter(400, write).flush()

    expect(write).not.toHaveBeenCalled()
  })

  it('cancel отменяет запланированную запись', () => {
    const write = vi.fn()
    const writer = createDebouncedWriter(400, write)

    writer.schedule()
    writer.cancel()
    vi.advanceTimersByTime(1000)

    expect(write).not.toHaveBeenCalled()
  })
})
