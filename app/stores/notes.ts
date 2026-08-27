import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { createDebouncedWriter, readNotes, writeNotes } from '~/core/persistence'
import { cloneNote, normalizeForSave } from '~/core/note'
import type { Note } from '~/core/types'

/**
 * Пауза перед записью в localStorage. Приложение пишет не на каждое изменение,
 * а один раз после того, как правки прекратились.
 */
export const PERSIST_DELAY = 400

export const useNotesStore = defineStore('notes', () => {
  const notes = ref<Note[]>([])
  const hydrated = ref(false)

  const writer = createDebouncedWriter(PERSIST_DELAY, () => {
    writeNotes(notes.value.map(cloneNote))
  })

  /** Заметки в списке идут от недавно изменённых к старым. */
  const ordered = computed(() => [...notes.value].sort((a, b) => b.updatedAt - a.updatedAt))
  const isEmpty = computed(() => notes.value.length === 0)

  function hydrate(): void {
    if (hydrated.value) {
      return
    }

    notes.value = readNotes()
    hydrated.value = true
  }

  /**
   * Перечитывает состояние из хранилища после правки в другой вкладке.
   * Обратной записи не делает: источник истины сейчас — хранилище.
   */
  function syncFromStorage(): void {
    notes.value = readNotes()
    hydrated.value = true
  }

  function byId(id: string): Note | null {
    return notes.value.find(note => note.id === id) ?? null
  }

  function has(id: string): boolean {
    return byId(id) !== null
  }

  function create(draft: Note, now: number = Date.now()): Note {
    const note = { ...normalizeForSave(draft), createdAt: draft.createdAt, updatedAt: now }

    notes.value.push(note)
    writer.schedule()

    return cloneNote(note)
  }

  function update(draft: Note, now: number = Date.now()): Note | null {
    const index = notes.value.findIndex(note => note.id === draft.id)

    if (index === -1) {
      return null
    }

    const existing = notes.value[index]!
    const note = { ...normalizeForSave(draft), createdAt: existing.createdAt, updatedAt: now }

    notes.value.splice(index, 1, note)
    writer.schedule()

    return cloneNote(note)
  }

  function remove(id: string): boolean {
    const index = notes.value.findIndex(note => note.id === id)

    if (index === -1) {
      return false
    }

    notes.value.splice(index, 1)
    writer.schedule()

    return true
  }

  /** Немедленно записывает отложенные изменения — например, перед закрытием вкладки. */
  function flush(): void {
    writer.flush()
  }

  return {
    notes,
    hydrated,
    ordered,
    isEmpty,
    hydrate,
    syncFromStorage,
    byId,
    has,
    create,
    update,
    remove,
    flush,
  }
})
