<script setup lang="ts">
import { computed, ref } from 'vue'
import { useNotesStore } from '~/stores/notes'

const store = useNotesStore()

const noteIdToRemove = ref<string | null>(null)

const noteToRemove = computed(() =>
  noteIdToRemove.value === null ? null : store.byId(noteIdToRemove.value),
)

const removeMessage = computed(() => {
  const title = noteToRemove.value?.title.trim()

  return title
    ? `Заметка «${title}» будет удалена без возможности восстановить.`
    : 'Заметка без названия будет удалена без возможности восстановить.'
})

function confirmRemove(): void {
  if (noteIdToRemove.value !== null) {
    store.remove(noteIdToRemove.value)
  }

  noteIdToRemove.value = null
}
</script>

<template>
  <div class="notes">
    <header class="notes__header">
      <h1 class="notes__title">
        Заметки
      </h1>
      <BaseButton variant="primary" @click="navigateTo('/notes/new')">
        Новая заметка
      </BaseButton>
    </header>

    <p v-if="store.isEmpty" class="notes__placeholder">
      Заметок пока нет. Создайте первую — она сохранится в этом браузере.
    </p>

    <ul v-else class="notes__list">
      <li v-for="note in store.ordered" :key="note.id">
        <NoteCard
          :note="note"
          @edit="navigateTo(`/notes/${note.id}`)"
          @remove="noteIdToRemove = note.id"
        />
      </li>
    </ul>

    <ConfirmDialog
      :open="noteToRemove !== null"
      title="Удалить заметку?"
      :message="removeMessage"
      confirm-label="Удалить"
      cancel-label="Отмена"
      tone="danger"
      @confirm="confirmRemove"
      @cancel="noteIdToRemove = null"
    />
  </div>
</template>

<style scoped lang="scss">
.notes {
  display: flex;
  flex-direction: column;
  gap: var(--sp-5);

  &__header {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sp-3);
    align-items: center;
    justify-content: space-between;
  }

  &__title {
    font-size: var(--fs-xl);
  }

  &__placeholder {
    padding: var(--sp-6) var(--sp-4);
    color: var(--c-fg-muted);
    text-align: center;
    background-color: var(--c-surface);
    border: 1px dashed var(--c-border-strong);
    border-radius: var(--radius-md);
  }

  &__list {
    display: grid;
    gap: var(--sp-4);

    @include media-up($bp-sm) {
      grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr));
      align-items: stretch;
    }
  }
}
</style>
