import { ScanBarcode, X } from 'lucide-preact'
import { useEffect, useState } from 'preact/hooks'

import type { Card } from '../types/Card.type'

import { BarcodeFormat, QRCodeFormat } from '../enums/codeFormats'
import { useBarcodeScanner } from '../hooks/useBarcodeScanner'
import { Button } from './ui/Button'
import ColorPicker, { PRESET_COLORS } from './ui/ColorPicker'
import { Input } from './ui/Input'
import { Select } from './ui/Select'
import { formatToLabel } from '../utils/text'

interface EditCardFormProps {
  initialCard: Card
  onSave: (card: Card) => void
  onClose: () => void
}

export function EditCardForm({ initialCard, onSave, onClose }: EditCardFormProps) {
  const [name, setName] = useState(initialCard.name)
  const [barcodeValue, setBarcodeValue] = useState(initialCard.barcodeValue)
  const [barcodeFormat, setBarcodeFormat] = useState<BarcodeFormat>(initialCard.barcodeFormat)
  const [qrCodeFormat, setQRCodeFormat] = useState<QRCodeFormat>(initialCard.qrCodeFormat ?? QRCodeFormat.QR_CODE)
  const [color, setColor] = useState<string>(initialCard.color ?? PRESET_COLORS[0])
  const [errors, setErrors] = useState<Record<string, boolean>>({})

  const { isScanning, scanError, videoRef, toggle, stop } = useBarcodeScanner({
    onDetect: (value, format) => {
      setBarcodeValue(value)
      if (format in BarcodeFormat) {
        setBarcodeFormat(format as BarcodeFormat)
      } else if (format in QRCodeFormat) {
        setQRCodeFormat(format as QRCodeFormat)
      }
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
      color: !color,
      qrCodeFormat: !qrCodeFormat,
    }
    setErrors(nextErrors)
    if (Object.values(nextErrors).some(Boolean)) return

    onSave({
      id: initialCard.id,
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
    <div class="inset-0 fixed bg-background backdrop-blur-sm z-50 flex flex-col p-4 animate-in fade-in slide-in-from-bottom-8 duration-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Edit Card</h2>
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
            error={errors.name ? 'Please enter a card name' : undefined}
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
            error={errors.barcodeValue ? 'Please enter a barcode number' : undefined}
          />

          <Select
            label="Barcode format"
            value={barcodeFormat}
            onChange={(e) => {
              setBarcodeFormat(Number((e.target as HTMLSelectElement).value) as BarcodeFormat)
              setErrors((prev) => ({ ...prev, barcodeFormat: false }))
            }}
            error={errors.barcodeFormat ? 'Please select a barcode format' : undefined}
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
            error={errors.qrCodeFormat ? 'Please select a QR code format' : undefined}
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

      <div className="mb-4">
        <Button type="button" onClick={toggle} variant="secondary">
          <ScanBarcode />
          {isScanning ? 'Stop Scanning' : 'Scan Barcode'}
        </Button>
        {isScanning && <video ref={videoRef} playsInline className="rounded-md mt-2" />}
        {scanError && <p className="text-red-500 text-xs mt-1">{scanError}</p>}
      </div>

      {!isScanning && (
        <Button type="submit" onClick={handleSubmit}>
          Save Card
        </Button>
      )}
    </div>
  )
}
