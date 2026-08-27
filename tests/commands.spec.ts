import { describe, expect, it } from 'vitest'
import type { Command } from '~/core/commands'
import { CommandError, apply, isMeaningful, revert } from '~/core/commands'
import type { Note } from '~/core/types'
import { clone, createRandom, makeNote, makeTodo } from './factories'

describe('команды заметки', () => {
  it('title.set меняет и возвращает название', () => {
    const note = makeNote()
    const command: Command = { type: 'title.set', prev: 'Покупки', next: 'Дела' }

    expect(apply(note, command).title).toBe('Дела')
    expect(revert(note, command).title).toBe('Покупки')
  })

  it('todo.add вставляет пункт в заданную позицию, revert его убирает', () => {
    const note = makeNote()
    const command: Command = { type: 'todo.add', index: 1, item: makeTodo({ id: 'x', text: 'Сыр' }) }

    apply(note, command)
    expect(note.todos.map(todo => todo.id)).toEqual(['a', 'x', 'b', 'c'])

    revert(note, command)
    expect(note.todos.map(todo => todo.id)).toEqual(['a', 'b', 'c'])
  })

  it('todo.remove возвращает удалённый пункт на прежнее место со прежним состоянием', () => {
    const note = makeNote()
    const removed = note.todos[1]!
    const command: Command = { type: 'todo.remove', index: 1, item: clone(removed) }

    apply(note, command)
    expect(note.todos.map(todo => todo.id)).toEqual(['a', 'c'])

    revert(note, command)
    expect(note.todos[1]).toEqual(removed)
  })

  it('todo.text и todo.toggle меняют только свой пункт', () => {
    const note = makeNote()

    apply(note, { type: 'todo.text', id: 'a', prev: 'Молоко', next: 'Молоко 3,2%' })
    apply(note, { type: 'todo.toggle', id: 'a', prev: false, next: true })

    expect(note.todos[0]).toEqual({ id: 'a', text: 'Молоко 3,2%', done: true })
    expect(note.todos[1]).toEqual(makeTodo({ id: 'b', text: 'Хлеб', done: true }))
  })

  it('обращение к несуществующему пункту — ошибка, а не молчаливый пропуск', () => {
    const note = makeNote()

    expect(() => apply(note, { type: 'todo.toggle', id: 'нет', prev: false, next: true }))
      .toThrow(CommandError)
    expect(() => apply(note, { type: 'todo.add', index: 99, item: makeTodo() }))
      .toThrow(CommandError)
  })

  it('isMeaningful отсеивает изменения, которые ничего не меняют', () => {
    expect(isMeaningful({ type: 'title.set', prev: 'Дела', next: 'Дела' })).toBe(false)
    expect(isMeaningful({ type: 'title.set', prev: 'Дела', next: 'Дело' })).toBe(true)
    expect(isMeaningful({ type: 'todo.add', index: 0, item: makeTodo() })).toBe(true)
  })

  it('revert(apply(note, command)) возвращает заметку в исходное состояние для случайных сценариев', () => {
    const random = createRandom(20_260_827)

    for (let attempt = 0; attempt < 200; attempt += 1) {
      const note = makeNote()
      const original = clone(note)
      const command = randomCommand(note, random)

      apply(note, command)
      revert(note, command)

      expect(note).toEqual(original)
    }
  })

  it('последовательность команд откатывается в обратном порядке до исходного состояния', () => {
    const random = createRandom(1_337)
    const note = makeNote()
    const original = clone(note)
    const applied: Command[] = []

    for (let step = 0; step < 100; step += 1) {
      const command = randomCommand(note, random)

      apply(note, command)
      applied.push(command)
    }

    for (const command of applied.reverse()) {
      revert(note, command)
    }

    expect(note).toEqual(original)
  })
})

function randomCommand(note: Note, random: () => number): Command {
  const pick = <T>(items: T[]): T => items[Math.floor(random() * items.length)]!
  const kinds = note.todos.length > 0
    ? ['title', 'add', 'remove', 'text', 'toggle'] as const
    : ['title', 'add'] as const

  switch (pick([...kinds])) {
    case 'add':
      return {
        type: 'todo.add',
        index: Math.floor(random() * (note.todos.length + 1)),
        item: makeTodo({ id: `gen-${Math.floor(random() * 1e9)}`, text: `Пункт ${random()}` }),
      }

    case 'remove': {
      const index = Math.floor(random() * note.todos.length)

      return { type: 'todo.remove', index, item: clone(note.todos[index]!) }
    }

    case 'text': {
      const todo = pick(note.todos)

      return { type: 'todo.text', id: todo.id, prev: todo.text, next: `${todo.text}!` }
    }

    case 'toggle': {
      const todo = pick(note.todos)

      return { type: 'todo.toggle', id: todo.id, prev: todo.done, next: !todo.done }
    }

    default:
      return { type: 'title.set', prev: note.title, next: `${note.title}.` }
  }
}
