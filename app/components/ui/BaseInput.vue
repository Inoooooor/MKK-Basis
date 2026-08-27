<script setup lang="ts">
import { useId } from 'vue'

withDefaults(defineProps<{
  modelValue: string
  label?: string
  placeholder?: string
  hiddenLabel?: boolean
  size?: 'md' | 'lg'
}>(), {
  label: '',
  placeholder: '',
  hiddenLabel: false,
  size: 'md',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'blur': []
}>()

const inputId = useId()

/**
 * Значение не связано через v-model напрямую: страница редактирования должна
 * знать исходный текст поля, чтобы свести серию нажатий в одну запись истории.
 */
function onInput(event: Event): void {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}
</script>

<template>
  <div class="field">
    <label
      v-if="label"
      :for="inputId"
      class="field__label"
      :class="{ 'field__label--hidden': hiddenLabel }"
    >{{ label }}</label>
    <input
      :id="inputId"
      :value="modelValue"
      :placeholder="placeholder"
      class="field__input"
      :class="`field__input--${size}`"
      type="text"
      autocomplete="off"
      @input="onInput"
      @blur="emit('blur')"
    >
  </div>
</template>

<style scoped lang="scss">
.field {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--sp-1);
  min-width: 0;

  &__label {
    font-size: var(--fs-sm);
    color: var(--c-fg-muted);

    &--hidden {
      @include visually-hidden;
    }
  }

  &__input {
    width: 100%;
    padding: var(--sp-2) var(--sp-3);
    color: var(--c-fg);
    background-color: var(--c-surface);
    border: 1px solid var(--c-border-strong);
    border-radius: var(--radius-sm);
    transition: border-color var(--transition);

    @include focus-ring(1px);

    &::placeholder {
      color: var(--c-fg-subtle);
    }

    &--lg {
      padding: var(--sp-3);
      font-size: var(--fs-lg);
      font-weight: 600;
    }
  }
}
</style>
