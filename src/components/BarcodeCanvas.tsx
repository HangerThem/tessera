import { toCanvas } from 'bwip-js/browser'
import { useEffect, useRef } from 'preact/hooks'

import { BarcodeFormat, type QRCodeFormat } from '../enums/codeFormats'

import { isQRCodeFormat, mapZXingFormatToBWIPJS } from '../utils/barcode'
import { tv } from 'tailwind-variants'

type RenderBarcodeProps = {
  value: string
  format: BarcodeFormat | QRCodeFormat
}

const styles = tv({
  slots: {
    wrapper: 'flex justify-center items-center w-full',
    canvas: 'rounded w-full max-h-full',
  },
  variants: {
    format: {
      qrcode: {
        wrapper: 'aspect-square max-h-40 w-auto',
      },
      barcode: {
        wrapper: 'max-h-30',
      }
    }
  },
})

export function RenderBarcode({ value, format }: RenderBarcodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { wrapper, canvas } = styles()
  const isQRCode = isQRCodeFormat(format)

  useEffect(() => {
    if (!canvasRef.current) return
    const bwipjsFormat = mapZXingFormatToBWIPJS(format)
    if (!bwipjsFormat) return
    try {
      toCanvas(canvasRef.current, {
        bcid: bwipjsFormat,
        text: value,
        scale: 2,
        height: isQRCode ? 100 : 20,
        width: 100,
        backgroundcolor: 'FFFFFF',
        padding: 10,
      })
    } catch (err) {
      console.error('Error rendering barcode:', err)
    }
  }, [value, format, isQRCode])

  return (
    <div className={wrapper({ format: isQRCode ? 'qrcode' : 'barcode' })}>
      <canvas ref={canvasRef} className={canvas()} />
    </div>
  )
}
