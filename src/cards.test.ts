import { beforeEach, describe, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => new Map<string, unknown>())

vi.mock('idb-keyval', () => ({
  createStore: () => ({}),
  get: async (key: string) => db.get(key),
  set: async (key: string, value: unknown) => void db.set(key, value),
  del: async (key: string) => void db.delete(key),
  keys: async () => [...db.keys()],
  getMany: async (keys: string[]) => keys.map((key) => db.get(key)),
}))

const { getCards, migrateCardFormats } = await import('./cards')

// ZXing format ids: Code 128 is 4, EAN-13 is 7, QR code is 11.
describe('migrateCardFormats', () => {
  beforeEach(() => db.clear())

  it("turns a card's barcode format into its single format", async () => {
    db.set('card-1', {
      id: 'card-1',
      name: 'Grocery',
      barcodeValue: '4006381333931',
      barcodeFormat: 7,
      qrCodeFormat: 11,
      isFavorite: false,
    })

    await migrateCardFormats()

    expect(await getCards()).toEqual([
      {
        id: 'card-1',
        name: 'Grocery',
        barcodeValue: '4006381333931',
        format: 7,
        isFavorite: false,
      },
    ])
  })

  it('leaves cards that already have a single format alone', async () => {
    const card = { id: 'card-2', name: 'Gym', barcodeValue: 'x', format: 11, isFavorite: true }
    db.set('card-2', card)

    await migrateCardFormats()

    expect(db.get('card-2')).toBe(card)
  })
})
