const DISMISSED_KEY = 'tessera.installPromptDismissedAt'
const DISMISS_FOR = 30 * 24 * 60 * 60 * 1000

/**
 * Whether this is Safari on iOS with the app not on the home screen. Safari clears the app's
 * storage after 7 days without a visit there, but not for home screen apps.
 *
 * `navigator.standalone` only exists on iOS, and is true in a home screen app.
 */
export function needsHomeScreenInstall(): boolean {
  return (navigator as Navigator & { standalone?: boolean }).standalone === false
}

/** Whether the user dismissed the home screen prompt in the last 30 days. */
export function isInstallPromptDismissed(now: number): boolean {
  try {
    const dismissedAt = Number(localStorage.getItem(DISMISSED_KEY))
    return dismissedAt > 0 && now - dismissedAt < DISMISS_FOR
  } catch {
    // Blocked storage: show the prompt; dismissing it still hides it for this visit.
    return false
  }
}

/** Hides the home screen prompt for 30 days. */
export function dismissInstallPrompt(now: number): void {
  try {
    localStorage.setItem(DISMISSED_KEY, String(now))
  } catch {
    // Blocked storage: nothing to remember it in.
  }
}

/**
 * Asks the browser to keep the app's storage rather than clearing it under storage pressure. The
 * browser decides; it's a no-op where unsupported. It doesn't stop Safari's 7-day limit outside the
 * home screen, but it lowers the chance of cards disappearing elsewhere.
 */
export async function requestPersistentStorage(): Promise<void> {
  try {
    if (!navigator.storage?.persist || (await navigator.storage.persisted())) return
    await navigator.storage.persist()
  } catch (err) {
    console.warn('Requesting persistent storage failed:', err)
  }
}
