import { renderHook, waitFor } from '@testing-library/preact'
import { describe, expect, it, vi } from 'vitest'

const loaded = vi.hoisted(() => ({ bwip: false }))

vi.mock('bwip-js/browser', async (importOriginal) => {
  loaded.bwip = true
  return importOriginal()
})

describe('useBarcodeRendering', () => {
  it('loads bwip-js only once it is used, and then returns its functions', async () => {
    const { useBarcodeRendering } = await import('./useBarcodeRendering')
    expect(loaded.bwip).toBe(false)

    const { result } = renderHook(() => useBarcodeRendering())

    expect(result.current).toBeUndefined()
    await waitFor(() => expect(result.current?.validateBarcodeValue).toBeTypeOf('function'))
    expect(loaded.bwip).toBe(true)
  })

  it('returns the functions straight away once they are loaded', async () => {
    const { loadBarcodeRendering, useBarcodeRendering } = await import('./useBarcodeRendering')
    await loadBarcodeRendering()

    const { result } = renderHook(() => useBarcodeRendering())

    expect(result.current?.renderBarcode).toBeTypeOf('function')
  })
})
