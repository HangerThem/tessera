import { useEffect, useRef, useState } from 'preact/hooks'

import type { Card } from '../types/Card.type'
import { BarcodeScanner } from '../barcodeScanner'
import { BarcodeFormat } from '../enums/barcode'
import { ScanBarcode, X } from 'lucide-preact'

const PRESET_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
]

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
  const [barcodeFormat, setBarcodeFormat] = useState<string>('')
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [isScanning, setIsScanning] = useState(false)
  const [scanError, setScanError] = useState('')
  const [errors, setErrors] = useState<Record<string, boolean>>({})
  const videoRef = useRef<HTMLVideoElement>(null)
  const scannerRef = useRef<BarcodeScanner | null>(null)

  const handleScan = async () => {
    if (!videoRef.current) return

    if (isScanning) {
      scannerRef.current?.stop()
      setIsScanning(false)
      return
    }

    setScanError('')
    setIsScanning(true)
  }

  useEffect(() => {
    if (!isScanning || !videoRef.current) return

    if (!scannerRef.current) {
      scannerRef.current = new BarcodeScanner(videoRef.current, {
        onDetect: (value, format) => {
          setBarcodeValue(value)
          setBarcodeFormat(String(format))
          setIsScanning(false)
          setScanError('')
        },
        onError: (message) => {
          setScanError(message)
          setIsScanning(false)
        },
      })
    }

    scannerRef.current.start()

    return () => {
      scannerRef.current?.stop()
    }
  }, [isScanning])

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = true
    }
  }, [])

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
      isFavorite: false,
      color,
    })
  }

  const handleClose = () => {
    scannerRef.current?.stop()
    onClose()
  }

  return (
    <div id="add-card-form" class="open">
      <div class="form-header">
        <h2>New Card</h2>
        <button type="button" class="form-close-btn" aria-label="Close" onClick={handleClose}>
          <X />
        </button>
      </div>

      <div class="form-field">
        <label for="card-name">Card name</label>
        <input
          id="card-name"
          type="text"
          placeholder="e.g. IKEA Family"
          autocomplete="off"
          value={name}
          onInput={(e) => {
            setName((e.target as HTMLInputElement).value)
            setErrors((prev) => ({ ...prev, name: false }))
          }}
          style={errors.name ? 'border-color: #e05858' : ''}
        />
      </div>

      <div class="form-field">
        <label for="card-barcode-value">Barcode number</label>
        <input
          id="card-barcode-value"
          type="text"
          placeholder="e.g. 123456789"
          autocomplete="off"
          value={barcodeValue}
          onInput={(e) => {
            setBarcodeValue((e.target as HTMLInputElement).value)
            setErrors((prev) => ({ ...prev, barcodeValue: false }))
          }}
          style={errors.barcodeValue ? 'border-color: #e05858' : ''}
        />
      </div>

      <div class="form-field">
        <label for="card-barcode-format">Barcode format</label>
        <select
          id="card-barcode-format"
          value={barcodeFormat}
          onChange={(e) => {
            setBarcodeFormat((e.target as HTMLSelectElement).value)
            setErrors((prev) => ({ ...prev, barcodeFormat: false }))
          }}
          style={errors.barcodeFormat ? 'border-color: #e05858' : ''}
        >
          <option value="" disabled>Select format</option>
          {Object.keys(BarcodeFormat)
            .filter((key) => isNaN(Number(key)))
            .map((key) => (
              <option value={BarcodeFormat[key as keyof typeof BarcodeFormat]} key={key}>
                {formatToLabel(key)}
              </option>
            ))}
        </select>
      </div>

      <div class="form-field">
        <label>Card colour</label>
        <div class="color-picker-row">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              class={`color-swatch ${color === c ? 'active' : ''}`}
              style={{ backgroundColor: c }}
              aria-label={c}
              onClick={() => setColor(c)}
            />
          ))}
          <button
            type="button"
            class={`color-swatch color-swatch-custom ${!PRESET_COLORS.includes(color) ? 'active' : ''}`}
            aria-label="Custom colour"
          >
            <input
              type="color"
              tabIndex={-1}
              onInput={(e) => setColor((e.target as HTMLInputElement).value)}
            />
          </button>
        </div>
      </div>

      <div class="scan-section">
        <button
          type="button"
          class={`btn-secondary ${isScanning ? 'scanning' : ''}`}
          onClick={handleScan}
        >
          <ScanBarcode />
          {isScanning ? 'Stop Scanning' : 'Scan Barcode'}
        </button>
        <video
          ref={videoRef}
          id="scan-video"
          playsInline
          style={isScanning ? 'display:block' : 'display:none'}
        />
        {scanError && <p class="scan-error">{scanError}</p>}
      </div>

      <div class="form-actions">
        <button type="button" class="btn-primary" onClick={handleSubmit}>
          Save Card
        </button>
      </div>
    </div>
  )
}