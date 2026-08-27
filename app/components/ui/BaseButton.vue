<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  type?: 'button' | 'submit'
  disabled?: boolean
  compact?: boolean
}>(), {
  variant: 'secondary',
  type: 'button',
  disabled: false,
  compact: false,
})
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    class="button"
    :class="[`button--${variant}`, { 'button--compact': compact }]"
  >
    <slot />
  </button>
</template>

<style scoped lang="scss">
.button {
  display: inline-flex;
  gap: var(--sp-2);
  align-items: center;
  justify-content: center;
  padding: var(--sp-2) var(--sp-4);
  font-size: var(--fs-base);
  font-weight: 500;
  white-space: nowrap;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  transition: background-color var(--transition), border-color var(--transition),
    color var(--transition);

  @include focus-ring;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  &--compact {
    padding: var(--sp-1) var(--sp-2);
    font-size: var(--fs-sm);
  }

  &--primary {
    color: var(--c-accent-fg);
    background-color: var(--c-accent);

    &:hover:not(:disabled) {
      filter: brightness(1.08);
    }
  }

  &--secondary {
    color: var(--c-fg);
    background-color: var(--c-surface);
    border-color: var(--c-border-strong);

    &:hover:not(:disabled) {
      background-color: var(--c-surface-muted);
    }
  }

  &--ghost {
    color: var(--c-fg-muted);
    background-color: transparent;

    &:hover:not(:disabled) {
      color: var(--c-fg);
      background-color: var(--c-surface-muted);
    }
  }

  &--danger {
    color: var(--c-danger);
    background-color: var(--c-danger-soft);

    &:hover:not(:disabled) {
      color: var(--c-danger-fg);
      background-color: var(--c-danger);
    }
  }
}
</style>
