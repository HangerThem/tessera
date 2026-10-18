import { TriangleAlert } from 'lucide-preact'
import { useEffect, useRef, useState } from 'preact/hooks'
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
  const wrapperRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hasError, setHasError] = useState(false)
  const isQRCode = isQRCodeFormat(format)

  useEffect(() => {
    const el = canvasRef.current
    if (!el) return

    const bwipjsFormat = mapZXingFormatToBWIPJS(format)

    el.width = 0
    el.height = 0

    if (!bwipjsFormat) return

    try {
      renderBarcode({
        element: el,
        value,
        format: bwipjsFormat,
        isQRCode,
        // clientWidth is 0 before layout, so fall back to renderBarcode's default width.
        width: wrapperRef.current?.clientWidth || undefined,
        pixelRatio: window.devicePixelRatio || 1,
      })
      setHasError(false)
    } catch (err) {
      console.error('Error rendering barcode:', err)
      setHasError(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, format])

  return (
    <div className={wrapper({ format: isQRCode ? 'qrcode' : 'barcode' })} ref={wrapperRef}>
      {hasError && (
        <div role="alert" className="flex flex-col items-center gap-1 text-center text-neutral-600">
          <p className="flex items-center gap-1 text-sm font-bold">
            <TriangleAlert className="w-4 h-4" aria-hidden="true" />
            Can't show this {isQRCode ? 'QR code' : 'barcode'}
          </p>
          <p className="text-xs">
            The number doesn't fit the selected format. Edit the card to fix it.
          </p>
        </div>
      )}
      {/* Stays mounted while hidden so switching format can render into it again. */}
      <canvas
        role="img"
        ref={canvasRef}
        hidden={hasError}
        className={canvas()}
        aria-label={`${isQRCode ? 'QR code' : 'Barcode'} for ${value}`}
      />
    </div>
  )
}
