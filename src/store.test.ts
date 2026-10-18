import { beforeEach, describe, expect, it, vi } from 'vitest'

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

const { cards, importCards, refreshCards } = await import('./store')

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
