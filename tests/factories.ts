import type { Note, TodoItem } from '~/core/types'

export function makeTodo(overrides: Partial<TodoItem> = {}): TodoItem {
  return {
    id: 'todo-1',
    text: 'Пункт',
    done: false,
    ...overrides,
  }
}

export function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: 'note-1',
    title: 'Покупки',
    todos: [
      makeTodo({ id: 'a', text: 'Молоко' }),
      makeTodo({ id: 'b', text: 'Хлеб', done: true }),
      makeTodo({ id: 'c', text: 'Кофе' }),
    ],
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_000_000,
    ...overrides,
  }
}

export function makeLargeNote(todoCount: number): Note {
  return makeNote({
    title: 'Большой список дел на неделю с длинным названием',
    todos: Array.from({ length: todoCount }, (_, index) => makeTodo({
      id: `todo-${index}`,
      text: `Пункт номер ${index} с достаточно длинным текстом описания`,
      done: index % 3 === 0,
    })),
  })
}

export function clone<T>(value: T): T {
  return structuredClone(value)
}

/** Детерминированный ГПСЧ: случайные сценарии в тестах должны быть воспроизводимы. */
export function createRandom(seed: number): () => number {
  let state = seed

  return () => {
    state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296

    return state / 4_294_967_296
  }
}
