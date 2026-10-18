import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  dismissInstallPrompt,
  isInstallPromptDismissed,
  needsHomeScreenInstall,
  requestPersistentStorage,
} from './install'

const DAY = 24 * 60 * 60 * 1000

function setStandalone(standalone: boolean | undefined) {
  Object.defineProperty(navigator, 'standalone', { value: standalone, configurable: true })
}

describe('needsHomeScreenInstall', () => {
  afterEach(() => setStandalone(undefined))

  it('is true in Safari on iOS when the app is not on the home screen', () => {
    setStandalone(false)
    expect(needsHomeScreenInstall()).toBe(true)
  })

  it('is false once the app is on the home screen', () => {
    setStandalone(true)
    expect(needsHomeScreenInstall()).toBe(false)
  })

  it('is false in other browsers, which have no navigator.standalone', () => {
    expect(needsHomeScreenInstall()).toBe(false)
  })
})

describe('install prompt dismissal', () => {
  afterEach(() => localStorage.clear())

  it('is remembered for 30 days', () => {
    const now = new Date('2026-10-18T12:00:00Z').getTime()
    expect(isInstallPromptDismissed(now)).toBe(false)

    dismissInstallPrompt(now)

    expect(isInstallPromptDismissed(now + 29 * DAY)).toBe(true)
    expect(isInstallPromptDismissed(now + 31 * DAY)).toBe(false)
  })

  it('counts as not dismissed when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError')
    })

    expect(isInstallPromptDismissed(Date.now())).toBe(false)
  })
})

describe('requestPersistentStorage', () => {
  afterEach(() =>
    Object.defineProperty(navigator, 'storage', { value: undefined, configurable: true }),
  )

  function mockStorage(persisted: boolean) {
    const storage = { persisted: vi.fn(async () => persisted), persist: vi.fn(async () => true) }
    Object.defineProperty(navigator, 'storage', { value: storage, configurable: true })
    return storage
  }

  it("asks the browser to keep the app's storage", async () => {
    const storage = mockStorage(false)

    await requestPersistentStorage()

    expect(storage.persist).toHaveBeenCalledOnce()
  })

  it("doesn't ask again once storage is persistent", async () => {
    const storage = mockStorage(true)

    await requestPersistentStorage()

    expect(storage.persist).not.toHaveBeenCalled()
  })

  it('does nothing where the browser does not support it', async () => {
    await expect(requestPersistentStorage()).resolves.toBeUndefined()
  })
})
