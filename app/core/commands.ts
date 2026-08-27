import type { Id, Note, TodoItem } from './types'

/**
 * Шаг истории описывается командой, а не снимком заметки.
 *
 * Каждая команда хранит ровно ту дельту, которая нужна, чтобы применить
 * изменение и откатить его обратно: предыдущее и следующее значение поля либо
 * сам удалённый пункт. Полная копия заметки в историю не попадает никогда,
 * поэтому 50 шагов истории стоят десятки байт на шаг, а не 50 копий заметки.
 */
export type Command =
  | { type: 'title.set', prev: string, next: string }
  | { type: 'todo.add', index: number, item: TodoItem }
  | { type: 'todo.remove', index: number, item: TodoItem }
  | { type: 'todo.text', id: Id, prev: string, next: string }
  | { type: 'todo.toggle', id: Id, prev: boolean, next: boolean }

export class CommandError extends Error {}

function requireTodo(note: Note, id: Id): TodoItem {
  const todo = note.todos.find(item => item.id === id)

  if (!todo) {
    throw new CommandError(`Пункт ${id} не найден в заметке ${note.id}`)
  }

  return todo
}

function requireIndex(note: Note, index: number, allowTail: boolean): void {
  const max = allowTail ? note.todos.length : note.todos.length - 1

  if (!Number.isInteger(index) || index < 0 || index > max) {
    throw new CommandError(`Индекс ${index} вне границ списка заметки ${note.id}`)
  }
}

/** Применяет команду к заметке. Мутирует переданный объект. */
export function apply(note: Note, command: Command): Note {
  switch (command.type) {
    case 'title.set':
      note.title = command.next
      break

    case 'todo.add':
      requireIndex(note, command.index, true)
      note.todos.splice(command.index, 0, { ...command.item })
      break

    case 'todo.remove':
      requireIndex(note, command.index, false)
      note.todos.splice(command.index, 1)
      break

    case 'todo.text':
      requireTodo(note, command.id).text = command.next
      break

    case 'todo.toggle':
      requireTodo(note, command.id).done = command.next
      break
  }

  return note
}

/** Откатывает команду. Инверсия apply: revert(apply(note, c), c) === note. */
export function revert(note: Note, command: Command): Note {
  switch (command.type) {
    case 'title.set':
      note.title = command.prev
      break

    case 'todo.add':
      requireIndex(note, command.index, false)
      note.todos.splice(command.index, 1)
      break

    case 'todo.remove':
      requireIndex(note, command.index, true)
      note.todos.splice(command.index, 0, { ...command.item })
      break

    case 'todo.text':
      requireTodo(note, command.id).text = command.prev
      break

    case 'todo.toggle':
      requireTodo(note, command.id).done = command.prev
      break
  }

  return note
}

/** Команда меняет состояние только если значения действительно разошлись. */
export function isMeaningful(command: Command): boolean {
  switch (command.type) {
    case 'title.set':
    case 'todo.text':
      return command.prev !== command.next
    case 'todo.toggle':
      return command.prev !== command.next
    default:
      return true
  }
}
