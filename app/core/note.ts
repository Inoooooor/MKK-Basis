import { createId } from './id'
import type { Note, TodoItem } from './types'

export function createEmptyNote(id: string = createId(), now: number = Date.now()): Note {
  return {
    id,
    title: '',
    todos: [],
    createdAt: now,
    updatedAt: now,
  }
}

export function createTodo(text = ''): TodoItem {
  return { id: createId(), text, done: false }
}

/**
 * Глубокая копия заметки. Написана вручную, а не через structuredClone:
 * в редакторе заметка обёрнута в реактивный Proxy, который structuredClone
 * клонировать отказывается.
 */
export function cloneNote(note: Note): Note {
  return {
    id: note.id,
    title: note.title,
    todos: note.todos.map(todo => ({ id: todo.id, text: todo.text, done: todo.done })),
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  }
}

/**
 * Приводит заметку к виду, в котором её имеет смысл хранить.
 *
 * Пустой текст пункта — это незавершённый ввод, а не данные: пользователь
 * нажал «добавить» и передумал. Такие пункты отбрасываются при сохранении.
 * Пустое название, наоборот, допустимо: заметка может быть просто чек-листом,
 * в списке она показывается как «Без названия».
 */
export function normalizeForSave(note: Note): Note {
  return {
    ...cloneNote(note),
    title: note.title.trim(),
    todos: note.todos
      .map(todo => ({ ...todo, text: todo.text.trim() }))
      .filter(todo => todo.text !== ''),
  }
}

/** Сравнивает содержимое заметок, игнорируя служебные отметки времени. */
export function haveSameContent(a: Note, b: Note): boolean {
  if (a.id !== b.id || a.title !== b.title || a.todos.length !== b.todos.length) {
    return false
  }

  return a.todos.every((todo, index) => {
    const other = b.todos[index]

    return other !== undefined
      && todo.id === other.id
      && todo.text === other.text
      && todo.done === other.done
  })
}

export interface TodoStats {
  done: number
  total: number
}

export function todoStats(note: Note): TodoStats {
  return {
    done: note.todos.filter(todo => todo.done).length,
    total: note.todos.length,
  }
}

/** Сколько пунктов Todo показывается в карточке на главной странице. */
export const PREVIEW_TODO_LIMIT = 3

export interface NotePreview {
  todos: TodoItem[]
  hiddenCount: number
  stats: TodoStats
}

/**
 * Сокращённое представление заметки для списка.
 *
 * Обрезка сделана здесь, а не в CSS: так количество скрытых пунктов известно
 * приложению, лишние элементы не попадают в разметку, а правило покрывается
 * обычным unit-тестом.
 */
export function previewNote(note: Note, limit: number = PREVIEW_TODO_LIMIT): NotePreview {
  return {
    todos: note.todos.slice(0, limit),
    hiddenCount: Math.max(0, note.todos.length - limit),
    stats: todoStats(note),
  }
}
