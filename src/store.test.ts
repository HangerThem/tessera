import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Card } from './types/Card.type'

// One map per database, like IndexedDB: cards and photos are both keyed by card id. Calls without a
// store use idb-keyval's default one.
const databases = vi.hoisted(() => new Map<string, Map<string, unknown>>())
const database = (store?: { name: string }) => {
  const name = store?.name ?? 'default'
  if (!databases.has(name)) databases.set(name, new Map())
  return databases.get(name)!
}
const db = database({ name: 'tessera' })
const photoDb = database({ name: 'tessera-photos' })
// Set to make every write fail, like a full disk or storage cleared mid-session.
const storage = vi.hoisted(() => ({ failWrites: false }))
const write = <T>(fn: () => T): T => {
  if (storage.failWrites) throw new Error('QuotaExceededError')
  return fn()
}

vi.mock('idb-keyval', () => ({
  createStore: (name: string) => ({ name }),
  get: async (key: string, store?: { name: string }) => database(store).get(key),
  set: async (key: string, value: unknown, store?: { name: string }) =>
    write(() => void database(store).set(key, value)),
  del: async (key: string, store?: { name: string }) =>
    write(() => void database(store).delete(key)),
  keys: async (store?: { name: string }) => [...database(store).keys()],
  getMany: async (keys: string[], store?: { name: string }) =>
    keys.map((key) => database(store).get(key)),
  update: async (key: string, updater: (value: unknown) => unknown, store?: { name: string }) =>
    write(() => void database(store).set(key, updater(database(store).get(key)))),
  entries: async (store?: { name: string }) => [...database(store).entries()],
}))

const {
  activeCardId,
  cards,
  deleteCard,
  editCardId,
  favoriteCard,
  importCards,
  isAddCardFormVisible,
  isDeleteConfirmVisible,
  loadCards,
  refreshCards,
  saveCard,
  updateCardById,
} = await import('./store')

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
    activeCardId.value = null
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

describe('photos', () => {
  const photo = new Blob(['jpeg'], { type: 'image/jpeg' })

  beforeEach(async () => {
    activeCardId.value = null
    db.clear()
    photoDb.clear()
    await refreshCards()
  })

  it('saves a new card with its photo', async () => {
    await saveCard(card('card-1', 'Grocery'), photo)

    expect(photoDb.get('card-1')).toBe(photo)
  })

  it('replaces, keeps or removes the photo when a card is edited', async () => {
    await saveCard(card('card-1', 'Grocery'), photo)

    const newPhoto = new Blob(['new'], { type: 'image/jpeg' })
    await updateCardById('card-1', card('card-1', 'Grocery'), newPhoto)
    expect(photoDb.get('card-1')).toBe(newPhoto)

    await updateCardById('card-1', card('card-1', 'Grocery'))
    expect(photoDb.get('card-1')).toBe(newPhoto)

    await updateCardById('card-1', card('card-1', 'Grocery'), null)
    expect(photoDb.has('card-1')).toBe(false)
  })

  it("deletes a card's photo with the card", async () => {
    await saveCard(card('card-1', 'Grocery'), photo)

    await deleteCard('card-1')

    expect(photoDb.has('card-1')).toBe(false)
  })

  it('imports photos only for the cards it adds', async () => {
    await saveCard(card('card-1', 'Grocery'))
    const imported = new Blob(['imported'], { type: 'image/jpeg' })

    await importCards([card('card-1', 'Renamed'), card('card-2', 'Library')], {
      'card-1': imported,
      'card-2': imported,
    })

    expect(photoDb.has('card-1')).toBe(false)
    expect(photoDb.get('card-2')).toBe(imported)
  })
})

describe('failed writes', () => {
  beforeEach(async () => {
    storage.failWrites = false
    activeCardId.value = null
    db.clear()
    db.set('card-1', card('card-1', 'Grocery'))
    await refreshCards()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    storage.failWrites = false
    activeCardId.value = null
    editCardId.value = null
    isAddCardFormVisible.value = false
    isDeleteConfirmVisible.value = false
    vi.restoreAllMocks()
  })

  it('keep the add form open when a new card fails to save', async () => {
    isAddCardFormVisible.value = true
    storage.failWrites = true

    await expect(saveCard(card('card-2', 'Library'))).rejects.toThrow()

    expect(isAddCardFormVisible.value).toBe(true)
  })

  it('keep the edit form and the card open when an edit fails to save', async () => {
    activeCardId.value = 'card-1'
    editCardId.value = 'card-1'
    storage.failWrites = true

    await expect(updateCardById('card-1', card('card-1', 'Renamed'))).rejects.toThrow()

    expect(editCardId.value).toBe('card-1')
    expect(activeCardId.value).toBe('card-1')
  })

  it('keep the delete confirmation and the card open when deleting fails', async () => {
    activeCardId.value = 'card-1'
    isDeleteConfirmVisible.value = true
    storage.failWrites = true

    await expect(deleteCard('card-1')).rejects.toThrow()

    expect(isDeleteConfirmVisible.value).toBe(true)
    expect(activeCardId.value).toBe('card-1')
  })

  it('roll back a favourite that could not be stored', async () => {
    storage.failWrites = true

    await favoriteCard('card-1')

    expect(cards.value[0].isFavorite).toBe(false)
  })
})
