import { onBeforeUnmount, onMounted } from 'vue'

export interface UndoRedoHandlers {
  undo: () => void
  redo: () => void
}

/**
 * Глобальные Ctrl+Z и Shift+Ctrl+Z на странице редактирования.
 *
 * Нативный undo браузера подавляется и внутри текстовых полей: единственным
 * источником правды остаётся история приложения. Иначе браузер откатил бы
 * содержимое поля, ничего не сказав приложению, и состояние разъехалось бы.
 * Цена решения — шагом отмены становится правка поля целиком, а не символ.
 *
 * Проверяется event.code, а не event.key: код клавиши не зависит от раскладки,
 * поэтому сочетание работает и в русской раскладке.
 */
export function useUndoRedo(handlers: UndoRedoHandlers): void {
  function onKeydown(event: KeyboardEvent): void {
    if (event.code !== 'KeyZ' || event.altKey) {
      return
    }

    if (!event.ctrlKey && !event.metaKey) {
      return
    }

    event.preventDefault()

    if (event.shiftKey) {
      handlers.redo()
    }
    else {
      handlers.undo()
    }
  }

  onMounted(() => window.addEventListener('keydown', onKeydown))
  onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
}
