import { useEffect, useRef } from 'preact/hooks'
import { tv } from 'tailwind-variants'

import { BarcodeFormat, type QRCodeFormat } from '../enums/codeFormats'
import { isQRCodeFormat, mapZXingFormatToBWIPJS, renderBarcode } from '../utils/barcode'

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

export function BarcodeCanvas({ value, format }: RenderBarcodeProps) {
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
      renderBarcode({ element: el, value, format: bwipjsFormat, isQRCode })
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
