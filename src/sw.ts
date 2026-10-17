import { signal } from '@preact/signals'
import { registerSW } from 'virtual:pwa-register'

/** True once a new version has been downloaded and is waiting to take over. */
export const isUpdateAvailable = signal(false)

const updateServiceWorker = registerSW({
  onNeedRefresh() {
    isUpdateAvailable.value = true
  },
  onOfflineReady() {
    console.log('App ready to work offline.')
  },
})

/** Activates the waiting version and reloads the page into it. */
export function applyUpdate(): Promise<void> {
  return updateServiceWorker(true)
}
