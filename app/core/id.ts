/**
 * Идентификаторы генерируются на клиенте. crypto.randomUUID доступен во всех
 * целевых браузерах, но требует защищённого контекста, поэтому оставлен фолбэк
 * на случай запуска по http на не-localhost адресе.
 */
export function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
