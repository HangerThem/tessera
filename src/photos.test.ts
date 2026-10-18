import { beforeEach, describe, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => new Map<string, unknown>())
const createStore = vi.hoisted(() => vi.fn(() => ({})))

vi.mock('idb-keyval', () => ({
  createStore,
  get: async (key: string) => db.get(key),
  set: async (key: string, value: unknown) => void db.set(key, value),
  del: async (key: string) => void db.delete(key),
  entries: async () => [...db.entries()],
}))

const { deletePhoto, getAllPhotos, getPhoto, savePhoto } = await import('./photos')

describe('photo storage', () => {
  beforeEach(() => db.clear())

  it("isn't opened until it's used", () => {
    expect(createStore).not.toHaveBeenCalled()
  })

  it("saves, reads and deletes a card's photo", async () => {
    const photo = new Blob(['jpeg'], { type: 'image/jpeg' })

    await savePhoto('card-1', photo)
    expect(await getPhoto('card-1')).toBe(photo)

    await deletePhoto('card-1')
    expect(await getPhoto('card-1')).toBeUndefined()
  })

  it('reads every photo, by card id', async () => {
    const photo = new Blob(['jpeg'], { type: 'image/jpeg' })
    await savePhoto('card-1', photo)

    expect(await getAllPhotos()).toEqual({ 'card-1': photo })
  })
})
