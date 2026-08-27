import { describe, expect, it } from 'vitest'
import {
  cloneNote,
  createEmptyNote,
  createTodo,
  haveSameContent,
  normalizeForSave,
  todoStats,
} from '~/core/note'
import { makeNote, makeTodo } from './factories'

describe('операции над заметкой', () => {
  it('новая заметка пустая и с одинаковыми отметками времени', () => {
    const note = createEmptyNote('id', 1000)

    expect(note).toEqual({ id: 'id', title: '', todos: [], createdAt: 1000, updatedAt: 1000 })
  })

  it('новый пункт получает уникальный идентификатор', () => {
    expect(createTodo('Раз').id).not.toBe(createTodo('Раз').id)
  })

  it('копия заметки не разделяет ссылки с оригиналом', () => {
    const note = makeNote()
    const copy = cloneNote(note)

    copy.todos[0]!.text = 'Изменено'
    copy.todos.push(makeTodo({ id: 'new' }))

    expect(note.todos).toHaveLength(3)
    expect(note.todos[0]!.text).toBe('Молоко')
  })

  it('пустые пункты отбрасываются при сохранении, пустое название допустимо', () => {
    const note = makeNote({
      title: '   ',
      todos: [makeTodo({ id: 'a', text: 'Молоко' }), makeTodo({ id: 'b', text: '   ' })],
    })

    const saved = normalizeForSave(note)

    expect(saved.title).toBe('')
    expect(saved.todos).toEqual([makeTodo({ id: 'a', text: 'Молоко' })])
  })

  it('текст названия и пунктов обрезается по краям', () => {
    const note = makeNote({
      title: '  Покупки  ',
      todos: [makeTodo({ id: 'a', text: '  Молоко  ' })],
    })

    const saved = normalizeForSave(note)

    expect(saved.title).toBe('Покупки')
    expect(saved.todos[0]!.text).toBe('Молоко')
  })

  it('сравнение содержимого игнорирует отметки времени', () => {
    const note = makeNote()
    const touched = { ...cloneNote(note), updatedAt: note.updatedAt + 5000 }

    expect(haveSameContent(note, touched)).toBe(true)
  })

  it('сравнение содержимого замечает правку названия, текста, флага и порядка', () => {
    const note = makeNote()

    expect(haveSameContent(note, { ...cloneNote(note), title: 'Другое' })).toBe(false)

    const withText = cloneNote(note)
    withText.todos[0]!.text = 'Кефир'
    expect(haveSameContent(note, withText)).toBe(false)

    const withFlag = cloneNote(note)
    withFlag.todos[0]!.done = true
    expect(haveSameContent(note, withFlag)).toBe(false)

    const reordered = cloneNote(note)
    reordered.todos.reverse()
    expect(haveSameContent(note, reordered)).toBe(false)

    const shorter = cloneNote(note)
    shorter.todos.pop()
    expect(haveSameContent(note, shorter)).toBe(false)
  })

  it('счётчик выполненных пунктов', () => {
    expect(todoStats(makeNote())).toEqual({ done: 1, total: 3 })
    expect(todoStats(makeNote({ todos: [] }))).toEqual({ done: 0, total: 0 })
  })
})
