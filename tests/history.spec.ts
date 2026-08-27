import { describe, expect, it } from 'vitest'
import type { Command } from '~/core/commands'
import { apply, revert } from '~/core/commands'
import { HISTORY_LIMIT, createHistory } from '~/core/history'
import { clone, makeLargeNote, makeNote, makeTodo } from './factories'

function toggle(id: string, next: boolean): Command {
  return { type: 'todo.toggle', id, prev: !next, next }
}

describe('история изменений', () => {
  it('undo и redo ходят по стеку в правильном порядке', () => {
    const history = createHistory<Command>()

    history.push(toggle('a', true))
    history.push(toggle('b', true))

    expect(history.undo()).toEqual(toggle('b', true))
    expect(history.undo()).toEqual(toggle('a', true))
    expect(history.undo()).toBeUndefined()

    expect(history.redo()).toEqual(toggle('a', true))
    expect(history.redo()).toEqual(toggle('b', true))
    expect(history.redo()).toBeUndefined()
  })

  it('canUndo и canRedo отражают состояние стеков', () => {
    const history = createHistory<Command>()

    expect(history.canUndo).toBe(false)
    expect(history.canRedo).toBe(false)

    history.push(toggle('a', true))
    expect(history.canUndo).toBe(true)
    expect(history.canRedo).toBe(false)

    history.undo()
    expect(history.canUndo).toBe(false)
    expect(history.canRedo).toBe(true)
  })

  it('новое изменение после undo очищает redo-ветку', () => {
    const history = createHistory<Command>()

    history.push(toggle('a', true))
    history.push(toggle('b', true))
    history.undo()

    expect(history.canRedo).toBe(true)

    history.push(toggle('c', true))

    expect(history.canRedo).toBe(false)
    expect(history.redo()).toBeUndefined()
    expect(history.entries()).toEqual([toggle('a', true), toggle('c', true)])
  })

  it('лимит истории — 50 шагов: 51-й вытесняет самый старый', () => {
    const history = createHistory<Command>()

    for (let step = 0; step < HISTORY_LIMIT + 10; step += 1) {
      history.push({ type: 'title.set', prev: `v${step}`, next: `v${step + 1}` })
    }

    expect(HISTORY_LIMIT).toBe(50)
    expect(history.size).toBe(50)
    expect(history.entries()[0]).toEqual({ type: 'title.set', prev: 'v10', next: 'v11' })
    expect(history.entries().at(-1)).toEqual({ type: 'title.set', prev: 'v59', next: 'v60' })
  })

  it('«сохранить» и «отменить редактирование» сбрасывают историю целиком', () => {
    const history = createHistory<Command>()

    history.push(toggle('a', true))
    history.push(toggle('b', true))
    history.undo()
    history.clear()

    expect(history.size).toBe(0)
    expect(history.redoSize).toBe(0)
    expect(history.canUndo).toBe(false)
    expect(history.canRedo).toBe(false)
  })

  it('в истории нет копий заметки: 50 шагов легче одной копии', () => {
    const note = makeLargeNote(200)
    const history = createHistory<Command>()

    for (let step = 0; step < HISTORY_LIMIT; step += 1) {
      const todo = note.todos[step]!

      history.push({ type: 'todo.toggle', id: todo.id, prev: todo.done, next: !todo.done })
    }

    const entries = history.entries()

    expect(entries).toHaveLength(50)
    expect(entries.every(entry => !('todos' in entry))).toBe(true)
    expect(JSON.stringify(entries).length).toBeLessThan(JSON.stringify(note).length)
  })

  it('вытесненные шаги остаются применёнными к заметке', () => {
    const history = createHistory<Command>({ limit: 2 })
    const note = makeNote({ title: '', todos: [] })

    const commands: Command[] = [
      { type: 'todo.add', index: 0, item: makeTodo({ id: 'a', text: 'Раз' }) },
      { type: 'todo.add', index: 1, item: makeTodo({ id: 'b', text: 'Два' }) },
      { type: 'todo.add', index: 2, item: makeTodo({ id: 'c', text: 'Три' }) },
    ]

    for (const command of commands) {
      apply(note, command)
      history.push(command)
    }

    // Первый шаг вытеснен лимитом: откатить можно только два последних.
    while (history.canUndo) {
      revert(note, history.undo()!)
    }

    expect(note.todos.map(todo => todo.id)).toEqual(['a'])
  })

  it('undo и redo восстанавливают ровно то же состояние заметки', () => {
    const history = createHistory<Command>()
    const note = makeNote()
    const original = clone(note)

    const commands: Command[] = [
      { type: 'title.set', prev: 'Покупки', next: 'Покупки на неделю' },
      { type: 'todo.toggle', id: 'a', prev: false, next: true },
      { type: 'todo.remove', index: 2, item: clone(note.todos[2]!) },
    ]

    for (const command of commands) {
      apply(note, command)
      history.push(command)
    }

    const afterAll = clone(note)

    while (history.canUndo) {
      revert(note, history.undo()!)
    }

    expect(note).toEqual(original)

    while (history.canRedo) {
      apply(note, history.redo()!)
    }

    expect(note).toEqual(afterAll)
  })

  it('нулевой или дробный лимит истории — ошибка конфигурации', () => {
    expect(() => createHistory({ limit: 0 })).toThrow()
    expect(() => createHistory({ limit: 2.5 })).toThrow()
  })
})
