import { computed, reactive, readonly, ref } from 'vue'
import type { Command } from '~/core/commands'
import { apply, isMeaningful, revert } from '~/core/commands'
import { HISTORY_LIMIT, createHistory } from '~/core/history'
import { cloneNote, createTodo, haveSameContent, normalizeForSave } from '~/core/note'
import type { Note } from '~/core/types'

/**
 * Пауза, после которой непрерывный ввод текста фиксируется одной записью
 * истории. Запись закрывается и раньше — по blur и перед любым другим действием.
 */
export const TEXT_COMMIT_DELAY = 600

type TextTarget = { kind: 'title' } | { kind: 'todo', id: string }

export interface NoteEditorOptions {
  note: Note
  textCommitDelay?: number
  historyLimit?: number
}

/**
 * Сессия редактирования одной заметки.
 *
 * Композабл намеренно не знает ни о роутере, ни о сторе, ни о хранилище:
 * он владеет черновиком заметки и историей изменений, а всё остальное
 * подключает страница. Благодаря этому семантику истории можно проверить
 * обычными unit-тестами, без монтирования компонентов.
 */
export function createNoteEditor(options: NoteEditorOptions) {
  const textCommitDelay = options.textCommitDelay ?? TEXT_COMMIT_DELAY
  const history = createHistory<Command>({ limit: options.historyLimit ?? HISTORY_LIMIT })

  const baseline = ref<Note>(cloneNote(options.note))
  const note = reactive<Note>(cloneNote(options.note))
  const revision = ref(0)

  let buffer: { target: TextTarget, from: string } | null = null
  let timer: ReturnType<typeof setTimeout> | null = null

  function stopTimer(): void {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
  }

  function currentText(target: TextTarget): string | null {
    if (target.kind === 'title') {
      return note.title
    }

    return note.todos.find(todo => todo.id === target.id)?.text ?? null
  }

  function sameTarget(a: TextTarget, b: TextTarget): boolean {
    return a.kind === b.kind && (a.kind === 'title' || a.id === (b as { id: string }).id)
  }

  function record(command: Command): void {
    if (!isMeaningful(command)) {
      return
    }

    history.push(command)
    revision.value += 1
  }

  /**
   * Закрывает открытую текстовую запись.
   *
   * Вызывается по таймеру, по потере фокуса и принудительно перед любым другим
   * действием: иначе отметка чекбокса успела бы встать в историю раньше текста,
   * который пользователь набрал до неё.
   */
  function flushText(): void {
    stopTimer()

    if (buffer === null) {
      return
    }

    const { target, from } = buffer

    buffer = null

    const to = currentText(target)

    // Пункт мог быть удалён во время набора — фиксировать нечего.
    if (to === null || to === from) {
      return
    }

    record(target.kind === 'title'
      ? { type: 'title.set', prev: from, next: to }
      : { type: 'todo.text', id: target.id, prev: from, next: to })
  }

  function beginTextEdit(target: TextTarget): void {
    if (buffer !== null && !sameTarget(buffer.target, target)) {
      // Пользователь перешёл в другое поле — предыдущая запись закрывается.
      flushText()
    }

    if (buffer === null) {
      buffer = { target, from: currentText(target) ?? '' }
    }

    stopTimer()
    timer = setTimeout(flushText, textCommitDelay)
  }

  function setTitle(value: string): void {
    beginTextEdit({ kind: 'title' })
    note.title = value
  }

  function setTodoText(id: string, value: string): void {
    const todo = note.todos.find(item => item.id === id)

    if (!todo) {
      return
    }

    beginTextEdit({ kind: 'todo', id })
    todo.text = value
  }

  function toggleTodo(id: string): void {
    flushText()

    const todo = note.todos.find(item => item.id === id)

    if (!todo) {
      return
    }

    const command: Command = { type: 'todo.toggle', id, prev: todo.done, next: !todo.done }

    apply(note, command)
    record(command)
  }

  /** Добавляет пустой пункт в конец и возвращает его идентификатор. */
  function addTodo(text = ''): string {
    flushText()

    const command: Command = {
      type: 'todo.add',
      index: note.todos.length,
      item: createTodo(text),
    }

    apply(note, command)
    record(command)

    return command.item.id
  }

  function removeTodo(id: string): void {
    flushText()

    const index = note.todos.findIndex(item => item.id === id)

    if (index === -1) {
      return
    }

    const command: Command = {
      type: 'todo.remove',
      index,
      item: { ...note.todos[index]! },
    }

    apply(note, command)
    record(command)
  }

  function undo(): void {
    flushText()

    const command = history.undo()

    if (command) {
      revert(note, command)
      revision.value += 1
    }
  }

  function redo(): void {
    flushText()

    const command = history.redo()

    if (command) {
      apply(note, command)
      revision.value += 1
    }
  }

  /** Заметка в том виде, в котором она уйдёт в стор. */
  function snapshot(): Note {
    flushText()

    return normalizeForSave(note)
  }

  /** Черновик как есть, без чистки: используется для восстановления сессии. */
  function rawSnapshot(): Note {
    return cloneNote(note)
  }

  /**
   * Переустанавливает содержимое редактора и обнуляет историю.
   *
   * История живёт в рамках сессии редактирования: сохранение, отмена
   * редактирования и восстановление черновика начинают её заново.
   * Отдельный nextBaseline нужен восстановлению черновика: содержимое берётся
   * из черновика, а точкой отсчёта «изменено ли» остаётся сохранённая заметка.
   */
  function reset(next: Note, nextBaseline: Note = next): void {
    stopTimer()
    buffer = null
    history.clear()

    baseline.value = cloneNote(nextBaseline)
    note.id = next.id
    note.title = next.title
    note.todos = next.todos.map(todo => ({ ...todo }))
    note.createdAt = next.createdAt
    note.updatedAt = next.updatedAt
    revision.value += 1
  }

  function destroy(): void {
    stopTimer()
    buffer = null
  }

  const isDirty = computed(() => {
    // revision заставляет пересчитать сравнение после undo/redo,
    // которые меняют вложенные поля через apply/revert.
    void revision.value

    return !haveSameContent(baseline.value, note)
  })

  const canUndo = computed(() => {
    void revision.value

    return history.canUndo
  })

  const canRedo = computed(() => {
    void revision.value

    return history.canRedo
  })

  return {
    note,
    baseline: readonly(baseline),
    isDirty,
    canUndo,
    canRedo,
    historySize: () => history.size,
    hasPendingText: () => buffer !== null,
    setTitle,
    setTodoText,
    flushText,
    toggleTodo,
    addTodo,
    removeTodo,
    undo,
    redo,
    snapshot,
    rawSnapshot,
    reset,
    destroy,
  }
}

export type NoteEditor = ReturnType<typeof createNoteEditor>
