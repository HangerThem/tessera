import { toCanvas } from 'bwip-js/browser'
import { useEffect, useRef } from 'preact/hooks'

import type { BarcodeFormat } from '../enums/codeFormats'

import { mapZXingFormatToBWIPJS } from '../utils/barcode'

type RenderBarcodeProps = {
  value: string
  format: BarcodeFormat
}

export function RenderBarcode({ value, format }: RenderBarcodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    const bwipjsFormat = mapZXingFormatToBWIPJS(format)
    if (!bwipjsFormat) return
    try {
      toCanvas(canvasRef.current, {
        bcid: bwipjsFormat,
        text: value,
        scale: 3,
        height: 10,
        backgroundcolor: 'FFFFFF',
        padding: 2,
      })
    } catch (err) {
      console.error('Error rendering barcode:', err)
    }
  }, [value, format])

  return (
    <div className="flex justify-center items-center w-full max-h-30">
      <canvas ref={canvasRef} className="rounded w-full max-h-full object-contain" />
    </div>
  )
}
