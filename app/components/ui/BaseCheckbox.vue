<script setup lang="ts">
defineProps<{
  modelValue: boolean
  label: string
}>()

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>

<template>
  <label class="checkbox">
    <input
      :checked="modelValue"
      class="checkbox__control"
      type="checkbox"
      @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    >
    <span class="checkbox__box" aria-hidden="true" />
    <span class="checkbox__label">{{ label }}</span>
  </label>
</template>

<style scoped lang="scss">
.checkbox {
  display: inline-flex;
  gap: var(--sp-2);
  align-items: center;
  cursor: pointer;

  &__control {
    @include visually-hidden;
  }

  &__box {
    position: relative;
    display: block;
    flex-shrink: 0;
    width: 1.15rem;
    height: 1.15rem;
    background-color: var(--c-surface);
    border: 1.5px solid var(--c-border-strong);
    border-radius: var(--radius-sm);
    transition: background-color var(--transition), border-color var(--transition);

    &::after {
      position: absolute;
      inset-block-start: 0.14rem;
      inset-inline-start: 0.36rem;
      width: 0.3rem;
      height: 0.6rem;
      content: '';
      border: solid var(--c-accent-fg);
      border-width: 0 2px 2px 0;
      opacity: 0;
      transform: rotate(45deg);
      transition: opacity var(--transition);
    }
  }

  &__label {
    min-width: 0;
  }

  &__control:checked + &__box {
    background-color: var(--c-accent);
    border-color: var(--c-accent);

    &::after {
      opacity: 1;
    }
  }

  &__control:focus-visible + &__box {
    outline: 2px solid var(--c-accent);
    outline-offset: 2px;
  }
}
</style>
