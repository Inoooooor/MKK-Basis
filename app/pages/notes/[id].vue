<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { createNoteEditor } from '~/composables/useNoteEditor'
import { useUndoRedo } from '~/composables/useUndoRedo'
import { cloneNote, createEmptyNote, haveSameContent } from '~/core/note'
import { createId } from '~/core/id'
import type { PersistedDraft } from '~/core/persistence'
import { clearDraft, createDebouncedWriter, readDraft, writeDraft } from '~/core/persistence'
import { PERSIST_DELAY, useNotesStore } from '~/stores/notes'

type Dialog = 'none' | 'cancel' | 'delete' | 'restore' | 'orphan'

const route = useRoute()
const store = useNotesStore()

// Состояние поднимается плагином при старте приложения; повторный вызов
// ничего не делает и снимает зависимость от порядка плагинов.
store.hydrate()

const noteId = String(route.params.id)
const isNew = noteId === 'new'
const savedNote = isNew ? null : store.byId(noteId)

/** Прямой переход по URL несуществующей заметки. */
const isMissing = !isNew && savedNote === null

const baseNote = savedNote ? cloneNote(savedNote) : createEmptyNote()
const editor = createNoteEditor({ note: baseNote })
const { note, isDirty, canUndo, canRedo, setTitle, setTodoText, flushText, toggleTodo, removeTodo } = editor

const dialog = ref<Dialog>('none')
const pendingDraft = ref<PersistedDraft | null>(null)
const isOrphaned = ref(false)
const focusTodoId = ref<string | null>(null)

/** Уход со страницы по решению пользователя: черновик и предупреждения больше не нужны. */
let leaving = false

const heading = computed(() => (isNew ? 'Новая заметка' : 'Изменение заметки'))

const cancelMessage = computed(() => (isDirty.value
  ? 'Несохранённые изменения будут потеряны.'
  : 'Изменений нет — вы вернётесь к списку заметок.'))

const draftSavedAt = computed(() => {
  if (!pendingDraft.value) {
    return ''
  }

  return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short' })
    .format(new Date(pendingDraft.value.savedAt))
})

/**
 * Черновик пишется по той же отложенной схеме, что и сами заметки: не на
 * каждое нажатие, а через паузу после последней правки.
 */
const draftWriter = createDebouncedWriter(PERSIST_DELAY, () => {
  if (leaving || isMissing) {
    return
  }

  if (isDirty.value) {
    writeDraft(noteId, editor.rawSnapshot())
  }
  else {
    clearDraft()
  }
})

watch(note, () => draftWriter.schedule(), { deep: true })

// Заметку могли удалить в соседней вкладке, пока она открыта здесь на
// редактирование. Приложение не ломается: страница переходит в режим сироты
// и предлагает сохранить правки как новую заметку.
watch(
  () => store.notes.some(item => item.id === noteId),
  (exists, existedBefore) => {
    if (isNew || leaving || exists || !existedBefore) {
      return
    }

    isOrphaned.value = true
    dialog.value = 'orphan'
  },
)

useUndoRedo({
  undo: () => {
    if (dialog.value === 'none' && !isMissing) {
      editor.undo()
    }
  },
  redo: () => {
    if (dialog.value === 'none' && !isMissing) {
      editor.redo()
    }
  },
})

function onVisibilityChange(): void {
  if (document.hidden) {
    flushText()
    draftWriter.flush()
  }
}

onMounted(() => {
  document.addEventListener('visibilitychange', onVisibilityChange)

  if (isMissing) {
    return
  }

  const stored = readDraft()

  if (!stored || stored.noteId !== noteId) {
    return
  }

  // У черновика новой заметки собственный идентификатор — сравнивается
  // только содержимое.
  if (haveSameContent({ ...stored.note, id: note.id }, note)) {
    clearDraft()

    return
  }

  pendingDraft.value = stored
  dialog.value = 'restore'
})

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onVisibilityChange)

  if (!leaving) {
    flushText()
    draftWriter.flush()
  }

  editor.destroy()
})

function finish(): void {
  leaving = true
  draftWriter.cancel()
  clearDraft()
  editor.destroy()
  store.flush()
  navigateTo('/')
}

function addTodo(): void {
  focusTodoId.value = editor.addTodo()
}

function saveAsNewNote(): void {
  const now = Date.now()

  store.create({ ...editor.snapshot(), id: createId(), createdAt: now, updatedAt: now }, now)
  finish()
}

function save(): void {
  if (isOrphaned.value) {
    saveAsNewNote()

    return
  }

  const snapshot = editor.snapshot()
  const saved = isNew ? store.create(snapshot) : store.update(snapshot)

  if (saved === null) {
    isOrphaned.value = true
    dialog.value = 'orphan'

    return
  }

  finish()
}

function confirmDelete(): void {
  store.remove(noteId)
  finish()
}

function restoreDraft(): void {
  if (pendingDraft.value) {
    // Точкой отсчёта остаётся сохранённая заметка: восстановленный черновик
    // считается несохранённым изменением. Идентификатор берётся из черновика —
    // у новой заметки он свой, и иначе сравнение содержимого всегда давало бы
    // «изменено».
    editor.reset(pendingDraft.value.note, { ...baseNote, id: pendingDraft.value.note.id })
  }

  pendingDraft.value = null
  dialog.value = 'none'
}

function discardDraft(): void {
  clearDraft()
  pendingDraft.value = null
  dialog.value = 'none'
}
</script>

<template>
  <div v-if="isMissing" class="missing">
    <h1 class="missing__title">
      Заметка не найдена
    </h1>
    <p class="missing__text">
      Заметки с адресом <code>{{ noteId }}</code> нет в этом браузере. Возможно,
      её удалили или ссылка открыта в другом браузере.
    </p>
    <BaseButton variant="primary" @click="navigateTo('/')">
      К списку заметок
    </BaseButton>
  </div>

  <div v-else class="editor">
    <header class="editor__top">
      <h1 class="editor__heading">
        {{ heading }}
      </h1>

      <div class="editor__history">
        <BaseButton
          :disabled="!canUndo"
          title="Ctrl+Z"
          compact
          @click="editor.undo()"
        >
          Отменить
        </BaseButton>
        <BaseButton
          :disabled="!canRedo"
          title="Shift+Ctrl+Z"
          compact
          @click="editor.redo()"
        >
          Повторить
        </BaseButton>
      </div>
    </header>

    <BaseInput
      :model-value="note.title"
      label="Название заметки"
      placeholder="Без названия"
      size="lg"
      @update:model-value="setTitle"
      @blur="flushText"
    />

    <section class="editor__todos">
      <h2 class="editor__subtitle">
        Задачи
      </h2>

      <ul v-if="note.todos.length > 0" class="editor__list">
        <TodoEditorItem
          v-for="todo in note.todos"
          :key="todo.id"
          :todo="todo"
          :autofocus="todo.id === focusTodoId"
          @toggle="toggleTodo(todo.id)"
          @update:text="setTodoText(todo.id, $event)"
          @blur="flushText"
          @remove="removeTodo(todo.id)"
          @focused="focusTodoId = null"
        />
      </ul>
      <p v-else class="editor__hint">
        Пунктов пока нет.
      </p>

      <BaseButton class="editor__add" @click="addTodo">
        Добавить пункт
      </BaseButton>
    </section>

    <footer class="editor__actions">
      <BaseButton variant="primary" @click="save">
        Сохранить
      </BaseButton>
      <BaseButton @click="dialog = 'cancel'">
        Отменить редактирование
      </BaseButton>
      <BaseButton
        v-if="!isNew && !isOrphaned"
        variant="danger"
        @click="dialog = 'delete'"
      >
        Удалить
      </BaseButton>
    </footer>
  </div>

  <ConfirmDialog
    :open="dialog === 'cancel'"
    title="Отменить редактирование?"
    :message="cancelMessage"
    confirm-label="Отменить редактирование"
    cancel-label="Продолжить"
    @confirm="finish"
    @cancel="dialog = 'none'"
  />

  <ConfirmDialog
    :open="dialog === 'delete'"
    title="Удалить заметку?"
    message="Заметка будет удалена без возможности восстановить."
    confirm-label="Удалить"
    cancel-label="Отмена"
    tone="danger"
    @confirm="confirmDelete"
    @cancel="dialog = 'none'"
  />

  <BaseModal
    :open="dialog === 'restore'"
    title="Восстановить черновик?"
    :dismissible="false"
    @close="discardDraft"
  >
    <p>
      Остались несохранённые изменения этой заметки от {{ draftSavedAt }}.
      Их можно вернуть или продолжить с сохранённой версии.
    </p>

    <template #actions>
      <BaseButton variant="ghost" @click="discardDraft">
        Отбросить
      </BaseButton>
      <BaseButton variant="primary" @click="restoreDraft">
        Восстановить
      </BaseButton>
    </template>
  </BaseModal>

  <BaseModal
    :open="dialog === 'orphan'"
    title="Заметка удалена"
    :dismissible="false"
    @close="finish"
  >
    <p>
      Эту заметку удалили в другой вкладке. Внесённые здесь изменения не
      потеряны — их можно сохранить как новую заметку.
    </p>

    <template #actions>
      <BaseButton variant="ghost" @click="finish">
        К списку
      </BaseButton>
      <BaseButton variant="primary" @click="saveAsNewNote">
        Сохранить как новую
      </BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped lang="scss">
.missing {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  align-items: flex-start;
  padding: var(--sp-6) var(--sp-5);
  background-color: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);

  &__title {
    font-size: var(--fs-xl);
  }

  &__text {
    color: var(--c-fg-muted);

    code {
      padding: 0 var(--sp-1);
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: var(--fs-sm);
      background-color: var(--c-surface-muted);
      border-radius: var(--radius-sm);
    }
  }
}

.editor {
  display: flex;
  flex-direction: column;
  gap: var(--sp-5);

  &__top {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sp-3);
    align-items: center;
    justify-content: space-between;
  }

  &__heading {
    font-size: var(--fs-xl);
  }

  &__history {
    display: flex;
    gap: var(--sp-2);
  }

  &__todos {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
    padding: var(--sp-4);
    background-color: var(--c-surface);
    border: 1px solid var(--c-border);
    border-radius: var(--radius-md);
  }

  &__subtitle {
    font-size: var(--fs-base);
    color: var(--c-fg-muted);
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
  }

  &__hint {
    color: var(--c-fg-subtle);
  }

  &__add {
    align-self: flex-start;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sp-2);
  }
}
</style>
