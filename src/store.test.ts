import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Card } from './types/Card.type'

const db = vi.hoisted(() => new Map<string, unknown>())

vi.mock('idb-keyval', () => ({
  createStore: () => ({}),
  get: async (key: string) => db.get(key),
  set: async (key: string, value: unknown) => void db.set(key, value),
  del: async (key: string) => void db.delete(key),
  keys: async () => [...db.keys()],
  getMany: async (keys: string[]) => keys.map((key) => db.get(key)),
  update: async (key: string, updater: (value: unknown) => unknown) =>
    void db.set(key, updater(db.get(key))),
}))

const { activeCardId, cards, importCards, loadCards, refreshCards, saveCard, updateCardById } =
  await import('./store')

const card = (id: string, name: string): Card => ({
  id,
  name,
  barcodeValue: '12345678',
  format: 4 as Card['format'], // BarcodeFormat.CODE_128
  isFavorite: false,
})

describe('importCards', () => {
  beforeEach(async () => {
    db.clear()
    db.set('card-1', card('card-1', 'Grocery'))
    await refreshCards()
  })

  it('adds cards that are not on the device yet', async () => {
    const result = await importCards([card('card-2', 'Library'), card('card-3', 'Gym')])

    expect(result).toEqual({ added: 2, skipped: 0 })
    expect(cards.value.map((c) => c.name).toSorted()).toEqual(['Grocery', 'Gym', 'Library'])
  })

  it('keeps cards already on the device as they are', async () => {
    const result = await importCards([card('card-1', 'Renamed'), card('card-2', 'Library')])

    expect(result).toEqual({ added: 1, skipped: 1 })
    expect(cards.value.find((c) => c.id === 'card-1')?.name).toBe('Grocery')
  })

  it('adds a card only once when the import lists it twice', async () => {
    const result = await importCards([card('card-2', 'Library'), card('card-2', 'Library')])

    expect(result).toEqual({ added: 1, skipped: 1 })
    expect(cards.value).toHaveLength(2)
  })
})

describe('persistent storage', () => {
  let persist: ReturnType<typeof vi.fn>

  beforeEach(() => {
    db.clear()
    persist = vi.fn(async () => true)
    Object.defineProperty(navigator, 'storage', {
      value: { persisted: async () => false, persist },
      configurable: true,
    })
  })

  afterEach(() => {
    Object.defineProperty(navigator, 'storage', { value: undefined, configurable: true })
  })

  it('is requested once there are cards to keep', async () => {
    await loadCards()
    expect(persist).not.toHaveBeenCalled()

    await saveCard(card('card-1', 'Grocery'))
    await vi.waitFor(() => expect(persist).toHaveBeenCalledOnce())
  })

  it('is requested when cards are imported', async () => {
    await importCards([card('card-2', 'Library')])

    await vi.waitFor(() => expect(persist).toHaveBeenCalled())
  })

  it('is requested on startup when there are cards', async () => {
    db.set('card-1', card('card-1', 'Grocery'))

    await loadCards()

    await vi.waitFor(() => expect(persist).toHaveBeenCalled())
  })
})

describe('updateCardById', () => {
  beforeEach(async () => {
    db.clear()
    db.set('card-1', { ...card('card-1', 'Grocery'), note: 'PIN 1234' })
    await refreshCards()
  })

  it('saves the edited card as it is, so a removed note stays removed', async () => {
    await updateCardById('card-1', card('card-1', 'Grocery'))

    expect(db.get('card-1')).not.toHaveProperty('note')
    expect(cards.value[0]).not.toHaveProperty('note')
  })
})

describe('recording use', () => {
  beforeEach(async () => {
    db.clear()
    db.set('card-1', card('card-1', 'Grocery'))
    await refreshCards()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-18T12:00:00Z'))
  })

  afterEach(() => {
    activeCardId.value = null
    vi.useRealTimers()
  })

  it('records when a card is opened', async () => {
    activeCardId.value = 'card-1'

    const openedAt = new Date('2026-10-18T12:00:00Z').getTime()
    expect(cards.value[0].lastUsedAt).toBe(openedAt)
    await vi.waitFor(() => expect(db.get('card-1')).toMatchObject({ lastUsedAt: openedAt }))
  })
})
