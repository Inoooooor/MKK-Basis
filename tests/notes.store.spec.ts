import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { NOTES_KEY, SCHEMA_VERSION, writeNotes } from '~/core/persistence'
import { PERSIST_DELAY, useNotesStore } from '~/stores/notes'
import { createEmptyNote } from '~/core/note'
import { makeNote, makeTodo } from './factories'

function readStored() {
  const raw = localStorage.getItem(NOTES_KEY)

  return raw === null ? null : JSON.parse(raw)
}

describe('стор заметок', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('поднимает состояние из хранилища один раз', () => {
    writeNotes([makeNote({ id: 'a' })], localStorage)

    const store = useNotesStore()

    store.hydrate()
    expect(store.notes).toHaveLength(1)

    localStorage.clear()
    store.hydrate()
    expect(store.notes).toHaveLength(1)
  })

  it('создаёт заметку и отдаёт независимую копию', () => {
    const store = useNotesStore()
    const draft = { ...createEmptyNote('new-1', 1000), title: 'Покупки' }

    const created = store.create(draft, 5000)

    created.title = 'Испорчено извне'

    expect(store.notes).toHaveLength(1)
    expect(store.byId('new-1')?.title).toBe('Покупки')
    expect(store.byId('new-1')?.createdAt).toBe(1000)
    expect(store.byId('new-1')?.updatedAt).toBe(5000)
  })

  it('сохранение отбрасывает пустые пункты', () => {
    const store = useNotesStore()

    store.create(makeNote({
      id: 'n',
      todos: [makeTodo({ id: 'a', text: 'Молоко' }), makeTodo({ id: 'b', text: '  ' })],
    }))

    expect(store.byId('n')?.todos).toHaveLength(1)
  })

  it('обновляет заметку, сохраняя дату создания', () => {
    const store = useNotesStore()

    store.create(makeNote({ id: 'n', title: 'Было', createdAt: 1000 }), 1000)
    const updated = store.update(makeNote({ id: 'n', title: 'Стало' }), 9000)

    expect(updated?.title).toBe('Стало')
    expect(store.byId('n')?.createdAt).toBe(1000)
    expect(store.byId('n')?.updatedAt).toBe(9000)
  })

  it('обновление удалённой заметки не создаёт её заново', () => {
    const store = useNotesStore()

    expect(store.update(makeNote({ id: 'нет' }))).toBeNull()
    expect(store.notes).toHaveLength(0)
  })

  it('удаляет заметку и сообщает, была ли она', () => {
    const store = useNotesStore()

    store.create(makeNote({ id: 'n' }))

    expect(store.remove('n')).toBe(true)
    expect(store.remove('n')).toBe(false)
    expect(store.has('n')).toBe(false)
  })

  it('список упорядочен от недавно изменённых к старым', () => {
    const store = useNotesStore()

    store.create(makeNote({ id: 'старая' }), 1000)
    store.create(makeNote({ id: 'новая' }), 9000)
    store.create(makeNote({ id: 'средняя' }), 5000)

    expect(store.ordered.map(note => note.id)).toEqual(['новая', 'средняя', 'старая'])
  })

  it('пишет в хранилище один раз после серии изменений, а не на каждое', () => {
    const store = useNotesStore()

    store.create(makeNote({ id: 'a' }))
    store.create(makeNote({ id: 'b' }))
    store.remove('a')

    expect(readStored()).toBeNull()

    vi.advanceTimersByTime(PERSIST_DELAY)

    const stored = readStored()

    expect(stored.version).toBe(SCHEMA_VERSION)
    expect(stored.notes.map((note: { id: string }) => note.id)).toEqual(['b'])
  })

  it('flush записывает немедленно — например, при уходе со вкладки', () => {
    const store = useNotesStore()

    store.create(makeNote({ id: 'a' }))
    store.flush()

    expect(readStored().notes).toHaveLength(1)
  })

  it('синхронизация из хранилища подхватывает правки другой вкладки', () => {
    const store = useNotesStore()

    store.hydrate()
    expect(store.isEmpty).toBe(true)

    writeNotes([makeNote({ id: 'из-другой-вкладки' })], localStorage)
    store.syncFromStorage()

    expect(store.has('из-другой-вкладки')).toBe(true)
  })

  it('синхронизация из хранилища не пишет обратно', () => {
    const store = useNotesStore()

    writeNotes([makeNote({ id: 'a' })], localStorage)
    store.syncFromStorage()
    localStorage.clear()

    vi.advanceTimersByTime(PERSIST_DELAY * 3)

    expect(readStored()).toBeNull()
  })
})
