import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TEXT_COMMIT_DELAY, createNoteEditor } from '~/composables/useNoteEditor'
import { makeNote, makeTodo } from './factories'

function typeText(editor: ReturnType<typeof createNoteEditor>, text: string): void {
  for (let length = 1; length <= text.length; length += 1) {
    editor.setTitle(text.slice(0, length))
  }
}

describe('семантика истории в сессии редактирования', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('непрерывный ввод текста в одно поле — одна запись в истории', () => {
    const editor = createNoteEditor({ note: makeNote({ title: '' }) })

    typeText(editor, 'Покупки')

    expect(editor.historySize()).toBe(0)

    vi.advanceTimersByTime(TEXT_COMMIT_DELAY)

    expect(editor.historySize()).toBe(1)
    expect(editor.note.title).toBe('Покупки')

    editor.undo()

    expect(editor.note.title).toBe('')
  })

  it('пауза внутри ввода разделяет его на две записи', () => {
    const editor = createNoteEditor({ note: makeNote({ title: '' }) })

    typeText(editor, 'Пок')
    vi.advanceTimersByTime(TEXT_COMMIT_DELAY)
    typeText(editor, 'Покупки')
    vi.advanceTimersByTime(TEXT_COMMIT_DELAY)

    expect(editor.historySize()).toBe(2)

    editor.undo()
    expect(editor.note.title).toBe('Пок')

    editor.undo()
    expect(editor.note.title).toBe('')
  })

  it('потеря фокуса фиксирует запись, не дожидаясь паузы', () => {
    const editor = createNoteEditor({ note: makeNote({ title: '' }) })

    typeText(editor, 'Дела')
    editor.flushText()

    expect(editor.historySize()).toBe(1)
    expect(editor.hasPendingText()).toBe(false)
  })

  it('переход в другое поле закрывает запись предыдущего', () => {
    const editor = createNoteEditor({ note: makeNote({ title: '' }) })

    editor.setTitle('Название')
    editor.setTodoText('a', 'Кефир')

    expect(editor.historySize()).toBe(1)

    vi.advanceTimersByTime(TEXT_COMMIT_DELAY)

    expect(editor.historySize()).toBe(2)

    editor.undo()
    expect(editor.note.todos[0]!.text).toBe('Молоко')

    editor.undo()
    expect(editor.note.title).toBe('')
  })

  it('ввод без фактического изменения не попадает в историю', () => {
    const editor = createNoteEditor({ note: makeNote({ title: 'Покупки' }) })

    editor.setTitle('Покупк')
    editor.setTitle('Покупки')
    vi.advanceTimersByTime(TEXT_COMMIT_DELAY)

    expect(editor.historySize()).toBe(0)
    expect(editor.isDirty.value).toBe(false)
  })

  it('отметка чекбокса, добавление и удаление пункта — отдельные атомарные записи', () => {
    const editor = createNoteEditor({ note: makeNote() })

    editor.toggleTodo('a')
    const addedId = editor.addTodo('Сыр')
    editor.removeTodo('b')

    expect(editor.historySize()).toBe(3)

    editor.undo()
    expect(editor.note.todos.map(todo => todo.id)).toEqual(['a', 'b', 'c', addedId])

    editor.undo()
    expect(editor.note.todos.map(todo => todo.id)).toEqual(['a', 'b', 'c'])

    editor.undo()
    expect(editor.note.todos[0]!.done).toBe(false)
    expect(editor.canUndo.value).toBe(false)
  })

  it('чекбокс во время набора текста не обгоняет текст в истории', () => {
    const editor = createNoteEditor({ note: makeNote({ title: '' }) })

    typeText(editor, 'Покупки')
    editor.toggleTodo('a')

    // Текстовая запись закрыта принудительно и стоит в истории раньше отметки.
    expect(editor.historySize()).toBe(2)

    editor.undo()
    expect(editor.note.todos[0]!.done).toBe(false)
    expect(editor.note.title).toBe('Покупки')

    editor.undo()
    expect(editor.note.title).toBe('')
  })

  it('новое изменение после undo очищает redo-ветку', () => {
    const editor = createNoteEditor({ note: makeNote() })

    editor.toggleTodo('a')
    editor.toggleTodo('c')
    editor.undo()

    expect(editor.canRedo.value).toBe(true)

    editor.toggleTodo('b')

    expect(editor.canRedo.value).toBe(false)
  })

  it('undo и redo возвращают заметку в те же состояния', () => {
    const editor = createNoteEditor({ note: makeNote() })

    editor.setTitle('Новое название')
    editor.flushText()
    editor.removeTodo('b')
    editor.addTodo('Сыр')

    const afterEdits = JSON.stringify(editor.note)

    editor.undo()
    editor.undo()
    editor.undo()

    expect(editor.isDirty.value).toBe(false)
    expect(editor.note.title).toBe('Покупки')
    expect(editor.note.todos.map(todo => todo.id)).toEqual(['a', 'b', 'c'])

    editor.redo()
    editor.redo()
    editor.redo()

    expect(JSON.stringify(editor.note)).toBe(afterEdits)
  })

  it('undo при незакрытой текстовой записи сначала фиксирует её', () => {
    const editor = createNoteEditor({ note: makeNote({ title: 'Было' }) })

    typeText(editor, 'Стало')
    editor.undo()

    expect(editor.note.title).toBe('Было')
    expect(editor.canRedo.value).toBe(true)
  })

  it('лимит истории соблюдается внутри сессии редактирования', () => {
    const editor = createNoteEditor({ note: makeNote(), historyLimit: 3 })

    editor.toggleTodo('a')
    editor.toggleTodo('a')
    editor.toggleTodo('a')
    editor.toggleTodo('a')

    expect(editor.historySize()).toBe(3)
  })

  it('удаление пункта во время его набора не роняет фиксацию текста', () => {
    const editor = createNoteEditor({ note: makeNote() })

    editor.setTodoText('a', 'Кефир')
    editor.removeTodo('a')
    vi.advanceTimersByTime(TEXT_COMMIT_DELAY)

    expect(editor.note.todos.map(todo => todo.id)).toEqual(['b', 'c'])
    expect(() => editor.undo()).not.toThrow()
  })

  it('reset начинает историю заново — сессия редактирования закончилась', () => {
    const editor = createNoteEditor({ note: makeNote() })

    editor.toggleTodo('a')
    editor.reset(makeNote({ id: 'другая', title: 'Другая' }))

    expect(editor.canUndo.value).toBe(false)
    expect(editor.canRedo.value).toBe(false)
    expect(editor.isDirty.value).toBe(false)
    expect(editor.note.title).toBe('Другая')
  })

  it('snapshot фиксирует незакрытый ввод и убирает пустые пункты', () => {
    const editor = createNoteEditor({ note: makeNote({ title: '', todos: [] }) })

    editor.addTodo('Молоко')
    editor.addTodo('')
    typeText(editor, 'Покупки')

    const saved = editor.snapshot()

    expect(saved.title).toBe('Покупки')
    expect(saved.todos.map(todo => todo.text)).toEqual(['Молоко'])
    expect(editor.historySize()).toBe(3)
  })

  it('редактор работает с копией: исходная заметка не меняется', () => {
    const source = makeNote()
    const editor = createNoteEditor({ note: source })

    editor.setTitle('Изменено')
    editor.toggleTodo('a')
    editor.removeTodo('b')

    expect(source.title).toBe('Покупки')
    expect(source.todos).toHaveLength(3)
    expect(source.todos[0]!.done).toBe(false)
  })

  it('isDirty отражает наличие несохранённых изменений', () => {
    const editor = createNoteEditor({ note: makeNote({ todos: [makeTodo({ id: 'a' })] }) })

    expect(editor.isDirty.value).toBe(false)

    editor.toggleTodo('a')
    expect(editor.isDirty.value).toBe(true)

    editor.undo()
    expect(editor.isDirty.value).toBe(false)
  })

  it('destroy снимает отложенную фиксацию текста', () => {
    const editor = createNoteEditor({ note: makeNote({ title: '' }) })

    typeText(editor, 'Покупки')
    editor.destroy()
    vi.advanceTimersByTime(TEXT_COMMIT_DELAY * 3)

    expect(editor.historySize()).toBe(0)
  })
})
