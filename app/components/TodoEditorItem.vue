<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { TodoItem } from '~/core/types'

const props = defineProps<{
  todo: TodoItem
  /** Фокус на только что добавленном пункте. */
  autofocus?: boolean
}>()

const emit = defineEmits<{
  toggle: []
  'update:text': [value: string]
  blur: []
  remove: []
  focused: []
}>()

const input = ref<{ focus: () => void } | null>(null)

onMounted(() => {
  if (props.autofocus) {
    input.value?.focus()
    emit('focused')
  }
})
</script>

<template>
  <li class="todo">
    <BaseCheckbox
      :model-value="todo.done"
      :label="`Отметить пункт «${todo.text || 'без текста'}» выполненным`"
      class="todo__checkbox"
      @update:model-value="emit('toggle')"
    />

    <BaseInput
      ref="input"
      :model-value="todo.text"
      label="Текст пункта"
      placeholder="Что нужно сделать"
      hidden-label
      class="todo__input"
      :class="{ 'todo__input--done': todo.done }"
      @update:model-value="emit('update:text', $event)"
      @blur="emit('blur')"
    />

    <BaseButton
      variant="ghost"
      compact
      class="todo__remove"
      :aria-label="`Удалить пункт «${todo.text || 'без текста'}»`"
      @click="emit('remove')"
    >
      ✕
    </BaseButton>
  </li>
</template>

<style scoped lang="scss">
.todo {
  display: flex;
  gap: var(--sp-2);
  align-items: center;

  &__checkbox {
    flex-shrink: 0;

    :deep(.checkbox__label) {
      @include visually-hidden;
    }
  }

  &__input {
    min-width: 0;

    &--done :deep(.field__input) {
      color: var(--c-fg-muted);
      text-decoration: line-through;
    }
  }

  &__remove {
    flex-shrink: 0;
  }
}
</style>
