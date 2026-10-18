import { describe, expect, it, vi } from 'vitest'

const createStore = vi.hoisted(() =>
  vi.fn(() => {
    throw new DOMException('The operation is insecure.', 'SecurityError')
  }),
)

vi.mock('idb-keyval', () => ({ createStore, get: vi.fn(), keys: vi.fn(), getMany: vi.fn() }))

describe('card storage', () => {
  it("isn't opened until it's used, so a failure to open it can be caught", async () => {
    const { getCards } = await import('./cards')

    expect(createStore).not.toHaveBeenCalled()
    await expect(getCards()).rejects.toThrow('The operation is insecure.')
  })
})
