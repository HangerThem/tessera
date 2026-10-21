import { describe, expect, it, vi } from 'vitest'

const loaded = vi.hoisted(() => ({ zxing: false }))

vi.mock('@zxing/library', async (importOriginal) => {
  loaded.zxing = true
  return importOriginal()
})

describe('code formats', () => {
  it("don't load ZXing, which is only needed to scan", async () => {
    await import('./codeFormats')

    expect(loaded.zxing).toBe(false)
  })
})
