export const HISTORY_LIMIT = 50

export interface CommandHistory<C> {
  /** Кладёт новый шаг. Любой новый шаг очищает redo-ветку. */
  push: (command: C) => void
  /** Снимает шаг с undo-стека и переносит его в redo. */
  undo: () => C | undefined
  /** Возвращает шаг из redo-стека обратно в undo. */
  redo: () => C | undefined
  clear: () => void
  readonly canUndo: boolean
  readonly canRedo: boolean
  readonly size: number
  readonly redoSize: number
  /** Только для тестов и отладки: копия undo-стека. */
  entries: () => readonly C[]
}

export interface HistoryOptions {
  limit?: number
}

/**
 * Стек undo/redo над произвольными командами.
 *
 * Модуль намеренно ничего не знает ни о заметках, ни о Vue: он оперирует
 * непрозрачными командами, а применение и откат делает вызывающая сторона.
 * Благодаря этому историю можно тестировать без монтирования компонентов.
 */
export function createHistory<C>(options: HistoryOptions = {}): CommandHistory<C> {
  const limit = options.limit ?? HISTORY_LIMIT

  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error(`Лимит истории должен быть натуральным числом, получено: ${limit}`)
  }

  let undoStack: C[] = []
  let redoStack: C[] = []

  return {
    push(command) {
      // Новое изменение после undo делает отменённую ветку недостижимой.
      redoStack = []
      undoStack.push(command)

      if (undoStack.length > limit) {
        // Вытесняем самые старые шаги: глубина истории ограничена сверху,
        // расход памяти не зависит от длительности сессии редактирования.
        undoStack.splice(0, undoStack.length - limit)
      }
    },

    undo() {
      const command = undoStack.pop()

      if (command !== undefined) {
        redoStack.push(command)
      }

      return command
    },

    redo() {
      const command = redoStack.pop()

      if (command !== undefined) {
        undoStack.push(command)
      }

      return command
    },

    clear() {
      undoStack = []
      redoStack = []
    },

    get canUndo() {
      return undoStack.length > 0
    },

    get canRedo() {
      return redoStack.length > 0
    },

    get size() {
      return undoStack.length
    },

    get redoSize() {
      return redoStack.length
    },

    entries() {
      return [...undoStack]
    },
  }
}
