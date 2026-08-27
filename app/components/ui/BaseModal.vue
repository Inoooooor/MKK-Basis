<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'

const props = withDefaults(defineProps<{
  open: boolean
  title: string
  /** Закрытие кликом по подложке. Отключается там, где нужен явный выбор. */
  dismissible?: boolean
}>(), {
  dismissible: true,
})

const emit = defineEmits<{ close: [] }>()

const dialog = ref<HTMLElement | null>(null)
const titleId = useId()

let returnFocusTo: HTMLElement | null = null

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

function focusableItems(): HTMLElement[] {
  if (!dialog.value) {
    return []
  }

  return Array.from(dialog.value.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter(element => element.getClientRects().length > 0)
}

/**
 * Ловушка фокуса: Tab и Shift+Tab ходят по кругу внутри окна и не выпускают
 * фокус на страницу под подложкой.
 */
function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    emit('close')

    return
  }

  if (event.key !== 'Tab') {
    return
  }

  const items = focusableItems()

  if (items.length === 0) {
    event.preventDefault()
    dialog.value?.focus()

    return
  }

  const first = items[0]!
  const last = items.at(-1)!
  const active = document.activeElement as HTMLElement | null
  const insideDialog = active !== null && dialog.value?.contains(active) === true

  if (event.shiftKey && (!insideDialog || active === first)) {
    event.preventDefault()
    last.focus()
  }
  else if (!event.shiftKey && (!insideDialog || active === last)) {
    event.preventDefault()
    first.focus()
  }
}

function lockScroll(locked: boolean): void {
  if (typeof document === 'undefined') {
    return
  }

  document.body.style.overflow = locked ? 'hidden' : ''
}

watch(() => props.open, async (open) => {
  if (open) {
    returnFocusTo = document.activeElement as HTMLElement | null
    lockScroll(true)
    await nextTick()

    const [firstFocusable] = focusableItems()

    ;(firstFocusable ?? dialog.value)?.focus()

    return
  }

  lockScroll(false)
  returnFocusTo?.focus()
  returnFocusTo = null
})

onBeforeUnmount(() => {
  lockScroll(false)
  returnFocusTo?.focus()
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="modal">
        <div
          class="modal__overlay"
          @click="dismissible && emit('close')"
        />
        <div
          ref="dialog"
          class="modal__dialog"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          tabindex="-1"
          @keydown="onKeydown"
        >
          <h2 :id="titleId" class="modal__title">
            {{ title }}
          </h2>

          <div class="modal__body">
            <slot />
          </div>

          <div class="modal__actions">
            <slot name="actions" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
.modal {
  position: fixed;
  z-index: 100;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: var(--sp-4);
  inset: 0;

  @include media-up($bp-sm) {
    align-items: center;
  }

  &__overlay {
    position: absolute;
    background-color: var(--c-overlay);
    inset: 0;
  }

  &__dialog {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--sp-4);
    width: 100%;
    max-width: 26rem;
    max-height: calc(100vh - var(--sp-6));
    padding: var(--sp-5);
    overflow-y: auto;
    background-color: var(--c-surface);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);

    &:focus-visible {
      outline: none;
    }
  }

  &__title {
    font-size: var(--fs-lg);
  }

  &__body {
    color: var(--c-fg-muted);
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sp-2);
    justify-content: flex-end;
  }
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity var(--transition);

  .modal__dialog {
    transition: transform var(--transition);
  }
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;

  .modal__dialog {
    transform: translateY(0.5rem);
  }
}
</style>
