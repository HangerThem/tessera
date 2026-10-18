import { ChevronDown, ScanBarcode, X } from 'lucide-preact'
import { useEffect, useId, useRef, useState } from 'preact/hooks'

import type { PhotoChange } from '../store'
import type { Card } from '../types/Card.type'

import { BarcodeFormat, type CodeFormat, QRCodeFormat } from '../enums/codeFormats'
import { useBarcodeScanner } from '../hooks/useBarcodeScanner'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { getPhoto } from '../photos'
import {
  BARCODE_FORMATS,
  formatLabel,
  QR_CODE_FORMATS,
  validateBarcodeValue,
} from '../utils/barcode'
import { holdKeyboardFocus } from '../utils/keyboard'
import { BarcodeScannerView } from './BarcodeScannerView'
import { PhotoField } from './PhotoField'
import { Button } from './ui/Button'
import ColorPicker, { DEFAULT_CARD_COLOR } from './ui/ColorPicker'
import { Input } from './ui/Input'
import { Select } from './ui/Select'

const NOTE_MAX_LENGTH = 200

interface Props {
  title: string
  closeLabel: string
  /** The card being edited. Leave out to create a new card. */
  initialCard?: Card
  /** Called with the card, and its photo change: a new photo, null to remove it, or undefined. */
  onSave: (card: Card, photo: PhotoChange) => void
  onClose: () => void
}

/** Form for creating or editing a card, with barcode scanning and manual entry. */
export function CardForm({ title, closeLabel, initialCard, onSave, onClose }: Props) {
  const titleId = useId()
  const [name, setName] = useState(initialCard?.name ?? '')
  const [barcodeValue, setBarcodeValue] = useState(initialCard?.barcodeValue ?? '')
  const [format, setFormat] = useState<CodeFormat>(initialCard?.format ?? BarcodeFormat.CODE_128)
  const [color, setColor] = useState<string>(initialCard?.color ?? DEFAULT_CARD_COLOR)
  const [note, setNote] = useState(initialCard?.note ?? '')
  const [storedPhoto, setStoredPhoto] = useState<Blob>()
  const [photoChange, setPhotoChange] = useState<PhotoChange>(undefined)
  const shownPhoto = photoChange === undefined ? storedPhoto : (photoChange ?? undefined)

  useEffect(() => {
    if (!initialCard) return
    getPhoto(initialCard.id)
      .then(setStoredPhoto)
      .catch((err) => console.error('Loading the photo failed:', err))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCard?.id])
  const [errors, setErrors] = useState<Record<string, boolean>>({})
  const [invalidValueError, setInvalidValueError] = useState<string>()
  const [isUnsupportedScan, setIsUnsupportedScan] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const dialogRef = useFocusTrap<HTMLDivElement>(true)

  const { cameraState, cameraError, videoRef, start, stop } = useBarcodeScanner({
    onDetect: (value, scannedFormat) => {
      setBarcodeValue(value)
      setInvalidValueError(undefined)
      setIsUnsupportedScan(false)
      if (scannedFormat in BarcodeFormat || scannedFormat in QRCodeFormat) {
        setFormat(scannedFormat as CodeFormat)
      } else {
        setIsUnsupportedScan(true)
      }
    },
  })

  const showScanner = cameraState !== 'idle'
  const focusBarcodeInputRef = useRef<ReturnType<typeof holdKeyboardFocus> | null>(null)

  useEffect(() => {
    if (cameraState !== 'idle' || !focusBarcodeInputRef.current) return
    focusBarcodeInputRef.current(
      dialogRef.current?.querySelector<HTMLInputElement>('input[name="barcodeValue"]'),
    )
    focusBarcodeInputRef.current = null
  }, [cameraState, dialogRef])

  const handleManualEntry = () => {
    // The barcode input only mounts after the rerender, so open the keyboard now while still in the tap (iOS).
    if (dialogRef.current) focusBarcodeInputRef.current = holdKeyboardFocus(dialogRef.current)
    stop()
  }

  const handleSubmit = () => {
    const nextErrors = {
      name: !name,
      barcodeValue: !barcodeValue,
      // Not !format: Aztec's id is 0.
      format: format === undefined || Number.isNaN(format),
    }
    setErrors(nextErrors)
    if (Object.values(nextErrors).some(Boolean)) return

    const invalidReason = validateBarcodeValue(format, barcodeValue)
    setInvalidValueError(
      invalidReason && `${invalidReason}. Check the number or change the format.`,
    )
    if (invalidReason) return

    // Keeps fields the form doesn't edit, and leaves out an empty note rather than storing "".
    const { note: _previousNote, ...unedited } = initialCard ?? {}
    const trimmedNote = note.trim()
    onSave(
      {
        ...unedited,
        id: initialCard?.id ?? crypto.randomUUID(),
        name,
        barcodeValue,
        format: Number(format) as CodeFormat,
        isFavorite: initialCard?.isFavorite ?? false,
        color,
        ...(trimmedNote && { note: trimmedNote }),
      },
      photoChange,
    )
  }

  const handleClose = () => {
    stop()
    onClose()
  }

  return (
    <div
      class="inset-0 fixed bg-background backdrop-blur-sm z-50 flex flex-col p-4 animate-in fade-in slide-in-from-bottom-8 duration-200"
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold" id={titleId}>
          {title}
        </h2>
        <button
          aria-label={closeLabel}
          type="button"
          className="text-foreground/50 hover:text-foreground cursor-pointer transition-colors"
          onClick={handleClose}
        >
          <X />
        </button>
      </div>

      {!showScanner && (
        <div className="space-y-4">
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
            name="barcodeValue"
            type="text"
            placeholder="e.g. 123456789"
            autocomplete="off"
            value={barcodeValue}
            onInput={(e) => {
              setBarcodeValue((e.target as HTMLInputElement).value)
              setErrors((prev) => ({ ...prev, barcodeValue: false }))
              setInvalidValueError(undefined)
              setIsUnsupportedScan(false)
            }}
            error={errors.barcodeValue ? 'Please enter a barcode number' : invalidValueError}
          />
          {isUnsupportedScan && (
            <p role="status" className="-mt-3 text-xs text-amber-600 dark:text-amber-400">
              Tessera can't show this barcode's format yet, so the card may not scan at checkout.
            </p>
          )}

          <ColorPicker allowCustom value={color} onChange={setColor} />

          <Input
            label="Note (optional)"
            type="text"
            placeholder="e.g. PIN 1234, Gold member"
            autocomplete="off"
            maxLength={NOTE_MAX_LENGTH}
            value={note}
            onInput={(e) => setNote((e.target as HTMLInputElement).value)}
          />

          <PhotoField photo={shownPhoto} onChange={setPhotoChange} />

          <button
            type="button"
            className="flex items-center gap-2 text-md text-foreground/70 hover:text-foreground transition-colors mt-4 mb-3 cursor-pointer"
            onClick={() => setShowAdvanced((prev) => !prev)}
          >
            Advanced Options
            <ChevronDown className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          </button>
          <div className={`${showAdvanced ? 'flex flex-col gap-2 mb-4' : 'hidden'}`}>
            <Select
              label="Barcode format"
              value={format}
              onChange={(e) => {
                setFormat(Number((e.target as HTMLSelectElement).value) as CodeFormat)
                setErrors((prev) => ({ ...prev, format: false }))
                setInvalidValueError(undefined)
              }}
              error={errors.format ? 'Please select a barcode format' : undefined}
            >
              <optgroup label="Barcodes">
                {BARCODE_FORMATS.map((option) => (
                  <option value={option} key={option}>
                    {formatLabel(option)}
                  </option>
                ))}
              </optgroup>
              <optgroup label="2D codes">
                {QR_CODE_FORMATS.map((option) => (
                  <option value={option} key={option}>
                    {formatLabel(option)}
                  </option>
                ))}
              </optgroup>
            </Select>
          </div>
        </div>
      )}

      {!showScanner && (
        <div className="mb-4">
          <Button type="button" onClick={start} variant="secondary">
            <ScanBarcode />
            Scan Barcode
          </Button>
        </div>
      )}

      <BarcodeScannerView
        cameraState={cameraState}
        cameraError={cameraError}
        videoRef={videoRef}
        onRetry={start}
        onManualEntry={handleManualEntry}
      />

      {!showScanner && (
        <Button type="submit" className="mt-auto" onClick={handleSubmit}>
          Save Card
        </Button>
      )}
    </div>
  )
}
