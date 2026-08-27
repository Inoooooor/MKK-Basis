<script setup lang="ts">
import { computed } from 'vue'
import { previewNote } from '~/core/note'
import type { Note } from '~/core/types'

const props = defineProps<{ note: Note }>()

const emit = defineEmits<{ edit: [], remove: [] }>()

const preview = computed(() => previewNote(props.note))
const title = computed(() => props.note.title.trim())
</script>

<template>
  <article class="note-card">
    <header class="note-card__header">
      <h2 class="note-card__title" :class="{ 'note-card__title--empty': !title }">
        {{ title || 'Без названия' }}
      </h2>
      <p v-if="preview.stats.total > 0" class="note-card__counter">
        {{ preview.stats.done }} / {{ preview.stats.total }}
      </p>
    </header>

    <ul v-if="preview.todos.length > 0" class="note-card__todos">
      <!--
        Отмечать пункты на главной нельзя, поэтому чекбокс здесь — рисунок,
        а не disabled-поле: такой элемент не попадает в обход с клавиатуры.
      -->
      <li
        v-for="todo in preview.todos"
        :key="todo.id"
        class="note-card__todo"
        :class="{ 'note-card__todo--done': todo.done }"
      >
        <span class="note-card__mark" :class="{ 'note-card__mark--done': todo.done }" aria-hidden="true" />
        <span class="note-card__text">{{ todo.text }}</span>
      </li>
    </ul>
    <p v-else class="note-card__empty">
      Список задач пуст
    </p>

    <p v-if="preview.hiddenCount > 0" class="note-card__more">
      и ещё {{ preview.hiddenCount }}
    </p>

    <footer class="note-card__actions">
      <BaseButton variant="secondary" compact @click="emit('edit')">
        Изменить
      </BaseButton>
      <BaseButton variant="danger" compact @click="emit('remove')">
        Удалить
      </BaseButton>
    </footer>
  </article>
</template>

<style scoped lang="scss">
.note-card {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  padding: var(--sp-4);
  background-color: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);

  &__header {
    display: flex;
    gap: var(--sp-3);
    align-items: baseline;
    justify-content: space-between;
  }

  &__title {
    font-size: var(--fs-lg);

    @include truncate;

    &--empty {
      font-style: italic;
      font-weight: 500;
      color: var(--c-fg-subtle);
    }
  }

  &__counter {
    flex-shrink: 0;
    font-size: var(--fs-sm);
    font-variant-numeric: tabular-nums;
    color: var(--c-fg-muted);
  }

  &__todos {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
  }

  &__todo {
    display: flex;
    gap: var(--sp-2);
    align-items: center;
    min-width: 0;
    font-size: var(--fs-base);

    &--done {
      color: var(--c-fg-muted);
      text-decoration: line-through;
    }
  }

  &__mark {
    position: relative;
    flex-shrink: 0;
    width: 1rem;
    height: 1rem;
    border: 1.5px solid var(--c-border-strong);
    border-radius: var(--radius-sm);

    &--done {
      background-color: var(--c-accent);
      border-color: var(--c-accent);

      &::after {
        position: absolute;
        inset-block-start: 0.08rem;
        inset-inline-start: 0.3rem;
        width: 0.26rem;
        height: 0.52rem;
        content: '';
        border: solid var(--c-accent-fg);
        border-width: 0 2px 2px 0;
        transform: rotate(45deg);
      }
    }
  }

  &__text {
    @include truncate;
  }

  &__empty,
  &__more {
    font-size: var(--fs-sm);
    color: var(--c-fg-subtle);
  }

  &__actions {
    display: flex;
    gap: var(--sp-2);
    justify-content: flex-end;
    margin-block-start: auto;
    padding-block-start: var(--sp-2);
    border-block-start: 1px solid var(--c-border);
  }
}
</style>
