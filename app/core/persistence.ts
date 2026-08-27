import type { Note, TodoItem } from './types'

/**
 * Версия схемы хранимых данных. Увеличивается при любом несовместимом
 * изменении формата, обработка старых версий добавляется в migrate().
 */
export const SCHEMA_VERSION = 1

export const NOTES_KEY = 'notes:v1'
export const DRAFT_KEY = 'notes:draft:v1'

export interface PersistedNotes {
  version: number
  notes: Note[]
}

export interface PersistedDraft {
  version: number
  noteId: string
  note: Note
  savedAt: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function asTimestamp(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : Date.now()
}

function normalizeTodo(raw: unknown): TodoItem | null {
  if (!isRecord(raw) || typeof raw.id !== 'string' || raw.id === '') {
    return null
  }

  return {
    id: raw.id,
    text: asString(raw.text),
    done: raw.done === true,
  }
}

function normalizeNote(raw: unknown): Note | null {
  if (!isRecord(raw) || typeof raw.id !== 'string' || raw.id === '') {
    return null
  }

  const todos = Array.isArray(raw.todos)
    ? raw.todos.map(normalizeTodo).filter((todo): todo is TodoItem => todo !== null)
    : []

  return {
    id: raw.id,
    title: asString(raw.title),
    todos,
    createdAt: asTimestamp(raw.createdAt),
    updatedAt: asTimestamp(raw.updatedAt),
  }
}

/**
 * Приводит прочитанные из хранилища данные к текущей схеме.
 *
 * Данные в localStorage мог записать кто угодно: другая версия приложения,
 * расширение браузера, сам пользователь через devtools. Поэтому вход считается
 * недоверенным: неизвестная версия и мусорные записи отбрасываются, а не
 * роняют приложение.
 */
export function migrate(raw: unknown): Note[] {
  if (!isRecord(raw)) {
    return []
  }

  const version = typeof raw.version === 'number' ? raw.version : 0

  switch (version) {
    // 0 — данные, записанные до появления версионирования схемы.
    case 0:
    case SCHEMA_VERSION: {
      if (!Array.isArray(raw.notes)) {
        return []
      }

      return raw.notes.map(normalizeNote).filter((note): note is Note => note !== null)
    }

    default:
      // Формат новее того, что умеет эта сборка: читать его вслепую опаснее,
      // чем начать с пустого списка.
      return []
  }
}

export function getStorage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') {
      return null
    }

    return localStorage
  }
  catch {
    // Например, запрет сторонних данных в браузере.
    return null
  }
}

function readJson(storage: Storage | null, key: string): unknown {
  if (!storage) {
    return null
  }

  try {
    const raw = storage.getItem(key)

    return raw === null ? null : JSON.parse(raw)
  }
  catch {
    return null
  }
}

function writeJson(storage: Storage | null, key: string, value: unknown): void {
  if (!storage) {
    return
  }

  try {
    storage.setItem(key, JSON.stringify(value))
  }
  catch {
    // Переполненная квота не должна ломать редактирование.
  }
}

export function readNotes(storage: Storage | null = getStorage()): Note[] {
  return migrate(readJson(storage, NOTES_KEY))
}

export function writeNotes(notes: Note[], storage: Storage | null = getStorage()): void {
  const payload: PersistedNotes = { version: SCHEMA_VERSION, notes }

  writeJson(storage, NOTES_KEY, payload)
}

export function readDraft(storage: Storage | null = getStorage()): PersistedDraft | null {
  const raw = readJson(storage, DRAFT_KEY)

  if (!isRecord(raw) || typeof raw.noteId !== 'string') {
    return null
  }

  if (typeof raw.version !== 'number' || raw.version !== SCHEMA_VERSION) {
    return null
  }

  const note = normalizeNote(raw.note)

  if (!note) {
    return null
  }

  return {
    version: SCHEMA_VERSION,
    noteId: raw.noteId,
    note,
    savedAt: asTimestamp(raw.savedAt),
  }
}

export function writeDraft(noteId: string, note: Note, storage: Storage | null = getStorage()): void {
  const payload: PersistedDraft = {
    version: SCHEMA_VERSION,
    noteId,
    note,
    savedAt: Date.now(),
  }

  writeJson(storage, DRAFT_KEY, payload)
}

export function clearDraft(storage: Storage | null = getStorage()): void {
  try {
    storage?.removeItem(DRAFT_KEY)
  }
  catch {
    // Нечего восстанавливать — молча продолжаем.
  }
}

export interface DebouncedWriter {
  /** Планирует запись. Повторные вызовы сдвигают таймер. */
  schedule: () => void
  /** Немедленно выполняет запланированную запись, если она есть. */
  flush: () => void
  /** Отменяет запланированную запись. */
  cancel: () => void
  readonly pending: boolean
}

/**
 * Откладывает запись в хранилище: приложение пишет не на каждое изменение,
 * а один раз после паузы. flush() нужен там, где вкладку могут закрыть
 * раньше срабатывания таймера.
 */
export function createDebouncedWriter(delay: number, write: () => void): DebouncedWriter {
  let timer: ReturnType<typeof setTimeout> | null = null

  function cancel(): void {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
  }

  return {
    schedule() {
      cancel()
      timer = setTimeout(() => {
        timer = null
        write()
      }, delay)
    },

    flush() {
      if (timer !== null) {
        cancel()
        write()
      }
    },

    cancel,

    get pending() {
      return timer !== null
    },
  }
}
