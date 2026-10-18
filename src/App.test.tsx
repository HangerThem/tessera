import { act, cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Card } from './types/Card.type'

import { App } from './App'
import { activeCardId, editCardId, isAddCardFormVisible, isBackupVisible, loadCards } from './store'
import { applyUpdate, isUpdateAvailable } from './sw'

// Hoisted so the idb-keyval mock below can return it.
const card = vi.hoisted((): Card => ({
  id: 'card-1',
  name: 'Grocery',
  barcodeValue: '12345678',
  format: 4 as Card['format'], // BarcodeFormat.CODE_128; enums can't be imported here
  isFavorite: false,
  color: '#3b82f6',
}))

vi.mock('./sw', async () => {
  const { signal } = await import('@preact/signals')
  return { isUpdateAvailable: signal(false), applyUpdate: vi.fn() }
})

const idb = vi.hoisted(() => ({ keys: vi.fn(async () => ['card-1']) }))

vi.mock('idb-keyval', () => ({
  createStore: () => ({}),
  get: async () => undefined,
  keys: () => idb.keys(),
  getMany: async (keys: string[]) => keys.map(() => card),
  set: async () => {},
  del: async () => {},
  update: async () => {},
}))

const cardDialog = () => screen.queryByRole('dialog', { name: 'Grocery' })
const deleteDialog = () => screen.queryByRole('dialog', { name: 'Delete card confirmation' })
const editDialog = () => screen.queryByRole('dialog', { name: 'Edit Card' })
const backupDialog = () => screen.queryByRole('dialog', { name: 'Backup' })

const pressEscape = () => fireEvent.keyDown(document, { key: 'Escape' })
const pressBack = () => fireEvent(window, new PopStateEvent('popstate'))

function openCard() {
  fireEvent.click(screen.getByRole('button', { name: 'View details for Grocery' }))
}

describe('App screen navigation', () => {
  beforeEach(async () => {
    // Rendering cards and requesting a wake lock log errors in happy-dom.
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await loadCards()
  })

  afterEach(() => {
    cleanup()
    activeCardId.value = null
    editCardId.value = null
    isAddCardFormVisible.value = false
    isBackupVisible.value = false
    isUpdateAvailable.value = false
  })

  it('closes only the delete confirmation on Escape', () => {
    render(<App />)
    openCard()
    fireEvent.click(screen.getByRole('button', { name: 'Delete card' }))

    pressEscape()

    expect(deleteDialog()).toBeNull()
    expect(cardDialog()).not.toBeNull()
  })

  it('closes only the edit form on Escape', () => {
    render(<App />)
    openCard()
    fireEvent.click(screen.getByRole('button', { name: 'Edit card' }))

    pressEscape()

    expect(editDialog()).toBeNull()
    expect(cardDialog()).not.toBeNull()
  })

  it('closes one screen at a time on back', () => {
    render(<App />)
    openCard()
    fireEvent.click(screen.getByRole('button', { name: 'Edit card' }))

    pressBack()
    expect(editDialog()).toBeNull()
    expect(cardDialog()).not.toBeNull()

    pressBack()
    expect(cardDialog()).toBeNull()
  })

  it('opens the backup screen from the header and closes it on back', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Backup' }))
    expect(backupDialog()).not.toBeNull()

    pressBack()
    expect(backupDialog()).toBeNull()
  })

  it('lets back leave the app when no screen is open', () => {
    render(<App />)
    const pushState = vi.spyOn(history, 'pushState')

    pressBack()

    expect(pushState).not.toHaveBeenCalled()
  })

  it('shows the update prompt once a new version is available', () => {
    render(<App />)
    expect(screen.queryByRole('status')).toBeNull()

    act(() => {
      isUpdateAvailable.value = true
    })
    fireEvent.click(screen.getByRole('button', { name: 'Reload' }))

    expect(applyUpdate).toHaveBeenCalledOnce()
  })

  it('hides the update prompt when dismissed', () => {
    isUpdateAvailable.value = true
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss update notice' }))

    expect(screen.queryByRole('status')).toBeNull()
  })
})

describe('App loading', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(cleanup)

  it("explains when storage can't be opened, and can try again", async () => {
    idb.keys.mockRejectedValueOnce(new DOMException('Storage is blocked', 'InvalidStateError'))
    await loadCards()
    render(<App />)

    expect(screen.getByRole('alert').textContent).toContain("Tessera can't open its storage")
    expect(screen.queryByRole('button', { name: 'Add card' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('button', { name: 'View details for Grocery' })).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it("doesn't say there are no cards while they're loading", () => {
    idb.keys.mockReturnValueOnce(new Promise(() => {}))
    void loadCards()
    render(<App />)

    expect(screen.queryByText('No cards yet')).toBeNull()
  })
})

describe('App home screen prompt', () => {
  const prompt = () => screen.queryByRole('region', { name: 'Add Tessera to your Home Screen' })

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    // Safari on iOS, not on the home screen.
    Object.defineProperty(navigator, 'standalone', { value: false, configurable: true })
  })

  afterEach(() => {
    cleanup()
    localStorage.clear()
    Object.defineProperty(navigator, 'standalone', { value: undefined, configurable: true })
  })

  it('asks Safari users with cards to add the app to the home screen, until dismissed', async () => {
    await loadCards()
    render(<App />)

    expect(prompt()?.textContent).toContain("Safari may delete your cards if you don't open")

    fireEvent.click(screen.getByRole('button', { name: 'Not now' }))
    expect(prompt()).toBeNull()

    cleanup()
    render(<App />)
    expect(prompt()).toBeNull()
  })

  it("doesn't ask before there are any cards", async () => {
    idb.keys.mockResolvedValueOnce([])
    await loadCards()
    render(<App />)

    expect(prompt()).toBeNull()
  })

  it("doesn't ask in other browsers", async () => {
    Object.defineProperty(navigator, 'standalone', { value: undefined, configurable: true })
    await loadCards()
    render(<App />)

    expect(prompt()).toBeNull()
  })
})
