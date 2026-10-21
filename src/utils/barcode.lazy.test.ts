import { describe, expect, it, vi } from 'vitest'

const loaded = vi.hoisted(() => ({ bwip: false }))

vi.mock('bwip-js/browser', async (importOriginal) => {
  loaded.bwip = true
  return importOriginal()
})

describe('barcode utilities', () => {
  it("don't load bwip-js, which the card list doesn't need", async () => {
    await import('./barcode')

    expect(loaded.bwip).toBe(false)
  })
})
