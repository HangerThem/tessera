import { toCanvas } from 'bwip-js/browser'

import { mapZXingFormatToBWIPJS } from '../utils/barcode'
import type { BarcodeFormat } from '../enums/barcode'
import { useEffect, useRef } from 'preact/hooks'

type RenderBarcodeProps = {
  value: string
  format: BarcodeFormat
  rotate: boolean
}

export function RenderBarcode({ value, format, rotate }: RenderBarcodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    const bwipjsFormat = mapZXingFormatToBWIPJS(format)
    if (!bwipjsFormat) return
    try {
      toCanvas(canvasRef.current, {
        bcid: bwipjsFormat,
        text: value,
        scale: 3,
        height: 8,
        backgroundcolor: 'FFFFFF',
        padding: 2,
      })
    } catch (err) {
      console.error('Error rendering barcode:', err)
    }
  }, [value, format])

  useEffect(() => {
    if (!rotate || !wrapperRef.current || !canvasRef.current) return
    const h = wrapperRef.current.getBoundingClientRect().height
    canvasRef.current.style.width = `${h}px`
  }, [rotate])

  return (
    <div ref={wrapperRef} class={`barcode-wrapper ${rotate ? 'barcode-wrapper--rotated' : ''}`}>
      <canvas ref={canvasRef} class="barcode-canvas" />
    </div>
  )
}