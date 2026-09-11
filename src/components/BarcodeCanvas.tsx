import { toCanvas } from 'bwip-js/browser'
import { useEffect, useRef, useState } from 'preact/hooks'

import { BarcodeFormat, type QRCodeFormat } from '../enums/codeFormats'
import { isQRCodeFormat, mapZXingFormatToBWIPJS } from '../utils/barcode'
import { tv } from 'tailwind-variants'

type RenderBarcodeProps = {
  value: string
  format: BarcodeFormat | QRCodeFormat
}

const { wrapper, canvas } = tv({
  slots: {
    wrapper: 'flex justify-center items-center w-full overflow-hidden',
    canvas: 'rounded max-w-full max-h-full',
  },
  variants: {
    format: {
      qrcode: {
        wrapper: 'w-40 h-40',
      },
      barcode: {
        wrapper: 'h-20',
      },
    },
  },
})()

export function RenderBarcode({ value, format }: RenderBarcodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isQRCode = isQRCodeFormat(format)

  useEffect(() => {
    const el = canvasRef.current
    if (!el) return

    const bwipjsFormat = mapZXingFormatToBWIPJS(format)

    el.width = 0
    el.height = 0

    if (!bwipjsFormat) return

    try {
      toCanvas(el, {
        bcid: bwipjsFormat,
        text: value,
        scale: 1,
        height: isQRCode ? 50 : 30,
        width: isQRCode ? 50 : 200,
        backgroundcolor: 'FFFFFF',
        padding: 4,
      })
    } catch (err) {
      console.error('Error rendering barcode:', err)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, format])

  return (
    <div className={wrapper({ format: isQRCode ? 'qrcode' : 'barcode' })}>
      <canvas ref={canvasRef} className={canvas()} />
    </div>
  )
}