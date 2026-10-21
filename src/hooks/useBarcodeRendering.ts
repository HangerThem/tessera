import { useEffect, useState } from 'preact/hooks'

type BarcodeRendering = typeof import('../utils/barcodeRendering')

let loading: Promise<BarcodeRendering> | undefined
let loaded: BarcodeRendering | undefined

/** Loads bwip-js and the functions that need it, once. A failed load is tried again next time. */
export function loadBarcodeRendering(): Promise<BarcodeRendering> {
  loading ??= import('../utils/barcodeRendering').then(
    (module) => (loaded = module),
    (err: unknown) => {
      loading = undefined
      throw err
    },
  )
  return loading
}

/**
 * The functions that draw codes and check values, or undefined while bwip-js loads. Loading starts
 * when a component using this first mounts, so the card list never loads it.
 */
export function useBarcodeRendering(): BarcodeRendering | undefined {
  const [rendering, setRendering] = useState(loaded)

  useEffect(() => {
    if (rendering) return
    let cancelled = false
    loadBarcodeRendering()
      .then((module) => !cancelled && setRendering(module))
      .catch((err) => console.error('Loading bwip-js failed:', err))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return rendering
}
