import { AnimatePresence, motion } from 'framer-motion'
import { ScanBarcode, X } from 'lucide-preact'
import { useEffect, useState } from 'preact/hooks'

import type { Card } from '../types/Card.type'

import { BarcodeFormat, QRCodeFormat } from '../enums/codeFormats'
import { useBarcodeScanner } from '../hooks/useBarcodeScanner'
import { isAddCardFormVisible } from '../store'
import { Button } from './ui/Button'
import ColorPicker, { PRESET_COLORS } from './ui/ColorPicker'
import { Input } from './ui/Input'
import { Select } from './ui/Select'

function formatToLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/\w\S*/g, (w) => w[0] + w.slice(1).toLowerCase())
}

interface Props {
  onSave: (card: Card) => void
  onClose: () => void
}

export function AddCardForm({ onSave, onClose }: Props) {
  const [name, setName] = useState('')
  const [barcodeValue, setBarcodeValue] = useState('')
  const [barcodeFormat, setBarcodeFormat] = useState<BarcodeFormat>(BarcodeFormat.CODE_128)
  const [qrCodeFormat, setQRCodeFormat] = useState<QRCodeFormat>(QRCodeFormat.QR_CODE)
  const [color, setColor] = useState<string>(PRESET_COLORS[0])
  const [errors, setErrors] = useState<Record<string, boolean>>({})

  const { isScanning, scanError, videoRef, toggle, stop } = useBarcodeScanner({
    onDetect: (value, format) => {
      setBarcodeValue(value)
      setBarcodeFormat(Number(format) as BarcodeFormat)
    },
  })

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = true
    }
  }, [videoRef])

  const handleSubmit = () => {
    const nextErrors = {
      name: !name,
      barcodeValue: !barcodeValue,
      barcodeFormat: !barcodeFormat,
    }
    setErrors(nextErrors)
    if (Object.values(nextErrors).some(Boolean)) return

    onSave({
      id: crypto.randomUUID(),
      name,
      barcodeValue,
      barcodeFormat: Number(barcodeFormat) as BarcodeFormat,
      qrCodeFormat: qrCodeFormat ? (Number(qrCodeFormat) as QRCodeFormat) : undefined,
      isFavorite: false,
      color,
    })
  }

  const handleClose = () => {
    stop()
    onClose()
  }

  return (
    <AnimatePresence>
      {isAddCardFormVisible.value && (
        <motion.div
          class="inset-0 fixed bg-background backdrop-blur-sm z-50 flex flex-col p-4"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">New Card</h2>
            <button
              type="button"
              className="text-foreground/50 hover:text-foreground cursor-pointer transition-colors"
              onClick={handleClose}
            >
              <X />
            </button>
          </div>

          {!isScanning && (
            <div className="space-y-4 mb-4">
              <Input
                label="Card name"
                type="text"
                placeholder="e.g. IKEA Family"
                autocomplete="off"
                value={name}
                onInput={(e) => {
                  setName((e.target as HTMLInputElement).value)
                  setErrors((prev) => ({ ...prev, name: false }))
                }}
              />

              <Input
                label="Barcode number"
                type="text"
                placeholder="e.g. 123456789"
                autocomplete="off"
                value={barcodeValue}
                onInput={(e) => {
                  setBarcodeValue((e.target as HTMLInputElement).value)
                  setErrors((prev) => ({ ...prev, barcodeValue: false }))
                }}
              />

              <Select
                label="Barcode format"
                value={barcodeFormat}
                onChange={(e) => {
                  setBarcodeFormat(Number((e.target as HTMLSelectElement).value) as BarcodeFormat)
                  setErrors((prev) => ({ ...prev, barcodeFormat: false }))
                }}
              >
                <option value="" disabled>
                  Select format
                </option>
                {Object.keys(BarcodeFormat)
                  .filter((key) => isNaN(Number(key)))
                  .map((key) => (
                    <option value={BarcodeFormat[key as keyof typeof BarcodeFormat]} key={key}>
                      {formatToLabel(key)}
                    </option>
                  ))}
              </Select>

              <Select
                label="QR code format (optional)"
                value={qrCodeFormat}
                onChange={(e) =>
                  setQRCodeFormat(Number((e.target as HTMLSelectElement).value) as QRCodeFormat)
                }
              >
                <option value="" disabled>
                  Select format
                </option>
                {Object.keys(QRCodeFormat)
                  .filter((key) => isNaN(Number(key)))
                  .map((key) => (
                    <option value={QRCodeFormat[key as keyof typeof QRCodeFormat]} key={key}>
                      {formatToLabel(key)}
                    </option>
                  ))}
              </Select>

              <ColorPicker allowCustom value={color} onChange={setColor} />
            </div>
          )}

          <div className="mb-4 space-y-2">
            <Button type="button" onClick={toggle} variant="secondary">
              <ScanBarcode />
              {isScanning ? 'Stop Scanning' : 'Scan Barcode'}
            </Button>
            {isScanning && <video ref={videoRef} playsInline className="rounded-md" />}
            {scanError && <p class="scan-error">{scanError}</p>}
          </div>

          {!isScanning && (
            <Button type="submit" onClick={handleSubmit}>
              Save Card
            </Button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
