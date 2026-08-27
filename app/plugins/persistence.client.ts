import { useNotesStore } from '~/stores/notes'
import { NOTES_KEY } from '~/core/persistence'

/**
 * Ручная синхронизация стора с localStorage: поднимает состояние при старте,
 * подхватывает правки соседних вкладок и досрочно записывает отложенные
 * изменения, когда вкладка уходит в фон.
 */
export default defineNuxtPlugin((nuxtApp) => {
  const store = useNotesStore(nuxtApp.$pinia as never)

  store.hydrate()

  // Событие storage приходит только в другие вкладки того же origin,
  // поэтому собственные записи сюда не возвращаются.
  window.addEventListener('storage', (event) => {
    if (event.key === NOTES_KEY || event.key === null) {
      store.syncFromStorage()
    }
  })

  // beforeunload не гарантирован на мобильных браузерах, а visibilitychange
  // и pagehide срабатывают и при сворачивании вкладки, и при закрытии.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      store.flush()
    }
  })

  window.addEventListener('pagehide', () => {
    store.flush()
  })
})
