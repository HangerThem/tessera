import {
  BarcodeIcon,
  ChevronLeft,
  Copy,
  CreditCard,
  Edit,
  ImageUpIcon,
  Eye,
  EyeOff,
  NotepadText,
  QrCodeIcon,
  ShareIcon,
  Star,
  Trash2,
  XIcon,
} from 'lucide-preact'
import { useEffect, useMemo, useState } from 'preact/hooks'
import { tv } from 'tailwind-variants'

import type { Card } from '../types/Card.type'

import { BarcodeFormat, QRCodeFormat } from '../enums/codeFormats'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { getPhoto } from '../photos'
import {
  activeCardId,
  deleteCard,
  editCardId,
  favoriteCard,
  isDeleteConfirmVisible,
  photoRevision,
} from '../store'
import {
  canDisplayLegibly,
  formatBarcodeValue,
  formatLabel,
  isQRCodeFormat,
  mapZXingFormatToBWIPJS,
  renderBarcode,
  validateBarcodeValue,
} from '../utils/barcode'
import { contrastColor, isDarkColor } from '../utils/color'
import { BarcodeCanvas } from './BarcodeCanvas'
import { Button } from './ui/Button'

interface ActiveCardProps {
  card: Card
}

const buttonStyle = tv({
  base: 'gap-2 cursor-pointer flex-1 flex items-center justify-center hover:text-white hover:bg-black p-1 rounded transition-colors',
  variants: {
    active: {
      true: 'bg-black text-white',
      false: 'bg-neutral-50 text-black hover:text-white hover:bg-black',
    },
  },
})

const noteStyle = tv({
  base: 'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
  variants: {
    dark: {
      false: 'bg-neutral-900/20 border border-neutral-900/30',
      true: 'bg-neutral-50/20 border border-neutral-50/30',
    },
  },
})

const shareButtonStyle = tv({
  base: 'gap-2 cursor-pointer flex items-center justify-center bg-neutral-50/20 hover:bg-neutral-50/40 border border-neutral-50/50 py-4 rounded-lg transition-colors flex-1',
  variants: {
    dark: {
      false: 'bg-neutral-900/20 hover:bg-neutral-900/40 border border-neutral-900/30',
      true: 'bg-neutral-50/20 hover:bg-neutral-50/40 border border-neutral-50/30',
    },
  },
})

export function ActiveCard({ card }: ActiveCardProps) {
  // Opens in the card's own format. The other one shows the same value as a QR code or a Code 128
  // barcode, for scanners that only read one kind.
  const ownKind = isQRCodeFormat(card.format) ? 'qr' : 'barcode'
  const [displayFormat, setDisplayFormat] = useState<'barcode' | 'qr'>(ownKind)
  const formatFor = (kind: 'barcode' | 'qr') =>
    kind === ownKind ? card.format : kind === 'qr' ? QRCodeFormat.QR_CODE : BarcodeFormat.CODE_128
  const displayedFormat = formatFor(displayFormat)
  const canShowOtherKind = useMemo(
    () => canDisplayLegibly(formatFor(ownKind === 'qr' ? 'barcode' : 'qr'), card.barcodeValue),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [card.format, card.barcodeValue],
  )
  const canRenderDisplayed = useMemo(
    () => validateBarcodeValue(displayedFormat, card.barcodeValue) === undefined,
    [displayedFormat, card.barcodeValue],
  )
  const isDark = isDarkColor(card.color ?? '#fff')
  // Hidden by default: this screen is shown to staff at checkout, and notes can hold a PIN.
  const [isNoteVisible, setIsNoteVisible] = useState(false)
  const [photoUrl, setPhotoUrl] = useState<string>()
  const currentPhotoRevision = photoRevision.value

  useEffect(() => {
    let url: string | undefined
    let cancelled = false
    getPhoto(card.id)
      .then((photo) => {
        if (cancelled || !photo) return
        url = URL.createObjectURL(photo)
        setPhotoUrl(url)
      })
      .catch((err) => console.error('Loading the photo failed:', err))
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
      setPhotoUrl(undefined)
    }
  }, [card.id, currentPhotoRevision])
  const [canShareText, setCanShareText] = useState(false)
  const [canShareFiles, setCanShareFiles] = useState(false)
  const [justCopied, setJustCopied] = useState(false)
  const dialogRef = useFocusTrap<HTMLDivElement>(true)
  const confirmRef = useFocusTrap<HTMLDivElement>(isDeleteConfirmVisible.value)

  useEffect(() => {
    if (!navigator.share || !navigator.canShare) return
    setCanShareText(true)
    // Probe file sharing with a dummy PNG file
    const probe = new File([''], 'probe.png', { type: 'image/png' })
    setCanShareFiles(navigator.canShare({ files: [probe] }))
  }, [])

  const handleShareText = async () => {
    try {
      await navigator.share({
        title: card.name,
        text: `${card.name}: ${formatBarcodeValue(card.format, card.barcodeValue)}`,
      })
    } catch (err) {
      if ((err as DOMException).name !== 'AbortError') console.error(err)
    }
  }

  const handleShareImage = async () => {
    const offscreen = document.createElement('canvas')
    const isQRCode = displayFormat === 'qr'
    const format = mapZXingFormatToBWIPJS(displayedFormat)

    try {
      // Drawn as for a 3x phone screen, so the image stays sharp wherever it's shown.
      renderBarcode({
        element: offscreen,
        value: card.barcodeValue,
        format,
        isQRCode,
        pixelRatio: 3,
      })
    } catch (err) {
      console.error('Error rendering barcode:', err)
      return
    }

    const blob = await new Promise<Blob | null>((resolve) => offscreen.toBlob(resolve, 'image/png'))
    if (!blob) return

    const file = new File([blob], `${card.name}-${isQRCode ? 'qr' : 'barcode'}.png`, {
      type: 'image/png',
    })

    try {
      await navigator.share({
        title: card.name,
        text: formatBarcodeValue(card.format, card.barcodeValue),
        files: [file],
      })
    } catch (err) {
      if ((err as DOMException).name !== 'AbortError') console.error(err)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(card.barcodeValue)
      setJustCopied(true)
      setTimeout(() => setJustCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  useEffect(() => {
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = ''
      isDeleteConfirmVisible.value = false
    }
  }, [])

  return (
    <>
      {isDeleteConfirmVisible.value && (
        <div
          className="fixed inset-0 bg-black/50 z-100 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Delete card confirmation"
          tabIndex={-1}
          ref={confirmRef}
        >
          <div className="bg-background p-3 text-foreground rounded-lg max-w-90">
            <h2 className="text-lg font-bold">Are you sure?</h2>
            <p className="text-sm text-foreground/70 mt-2">
              This action will permanently delete the card "{card.name}". This cannot be undone.
            </p>
            <div className="flex gap-2 mt-4 justify-end">
              <Button
                variant="primary"
                size="small"
                onClick={() => (isDeleteConfirmVisible.value = false)}
              >
                <XIcon className="w-4 h-4" />
                Cancel
              </Button>
              <Button variant="secondary" size="small" onClick={() => deleteCard(card.id)}>
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={card.name}
        className="z-50 fixed inset-0 p-3 overflow-hidden flex flex-col gap-4"
        style={{
          backgroundColor: card.color ?? '#fff',
          color: card.color ? contrastColor(card.color) : '#000',
        }}
        tabIndex={-1}
        ref={dialogRef}
      >
        <div className="flex items-center justify-between">
          <button
            className="flex items-center gap-1 cursor-pointer"
            onClick={() => (activeCardId.value = null)}
          >
            <ChevronLeft className="w-5 h-5" />
            <h1 className="text-2xl font-bold">Tessera</h1>
          </button>
          <div className="flex gap-2">
            <button
              aria-label="Edit card"
              className="cursor-pointer p-2 rounded-lg hover:bg-black/10 transition-colors"
              onClick={() => (editCardId.value = card.id)}
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              aria-label="Delete card"
              className="cursor-pointer p-2 rounded-lg hover:bg-black/10 transition-colors"
              onClick={() => (isDeleteConfirmVisible.value = true)}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-2 p-2 bg-white rounded-xl shadow">
          <div className="flex items-center gap-2 border-b border-neutral-200 pb-2">
            <div
              aria-hidden="true"
              className="flex items-center justify-center p-2 rounded-lg"
              style={{
                backgroundColor: card.color ?? '#fff',
                color: card.color ? contrastColor(card.color) : '#000',
              }}
            >
              <CreditCard className="w-6 h-6" />
            </div>
            <div className="mr-auto">
              <p className="text-sm text-black font-bold">{card.name}</p>
              <p className="text-xs text-neutral-500">{formatLabel(card.format)}</p>
            </div>
            <button
              aria-label={card.isFavorite ? 'Unmark as favorite' : 'Mark as favorite'}
              aria-pressed={card.isFavorite}
              onClick={() => favoriteCard(card.id)}
              className="cursor-pointer"
            >
              <Star
                className={`w-5 h-5 text-black ${card.isFavorite ? 'fill-current' : 'fill-none'}`}
                aria-hidden="true"
              />
            </button>
          </div>
          {canShowOtherKind && (
            <div
              role="group"
              aria-label="Display format"
              className="flex gap-2 items-center justify-center p-2 rounded-lg bg-neutral-100"
            >
              <button
                className={buttonStyle({ active: displayFormat === 'qr' })}
                onClick={() => setDisplayFormat('qr')}
                aria-pressed={displayFormat === 'qr'}
              >
                <QrCodeIcon className="w-5 h-5" />
                <span className="text-sm">QR Code</span>
              </button>
              <button
                className={buttonStyle({ active: displayFormat === 'barcode' })}
                onClick={() => setDisplayFormat('barcode')}
                aria-pressed={displayFormat === 'barcode'}
              >
                <BarcodeIcon className="w-5 h-5" />
                <span className="text-sm">Barcode</span>
              </button>
            </div>
          )}
          <div>
            <div className="flex items-center justify-center">
              <BarcodeCanvas format={displayedFormat} value={card.barcodeValue} />
            </div>
            <div className="flex items-center justify-between gap-2 mt-2">
              <p className="text-sm text-neutral-500 text-center font-mono select-none">
                {formatBarcodeValue(card.format, card.barcodeValue)}
              </p>
              <button
                onClick={handleCopy}
                className="cursor-pointer flex"
                aria-label="Copy card number"
              >
                <Copy className="w-4 h-4 text-neutral-500" />
              </button>
              <span aria-live="polite" aria-atomic="true" className="sr-only">
                {justCopied ? 'Copied!' : ''}
              </span>
            </div>
          </div>
        </div>

        {photoUrl && (
          <img
            src={photoUrl}
            alt={`Photo of ${card.name}`}
            className="w-full max-h-[40vh] object-contain rounded-xl"
          />
        )}
        {(canShareText || (canShareFiles && canRenderDisplayed)) && (
          <div className="flex gap-2 w-full">
            {canShareText && (
              <button className={shareButtonStyle({ dark: isDark })} onClick={handleShareText}>
                <ShareIcon className="w-5 h-5" />
                <span className="text-sm">Share</span>
              </button>
            )}
            {canShareFiles && canRenderDisplayed && (
              <button className={shareButtonStyle({ dark: isDark })} onClick={handleShareImage}>
                <ImageUpIcon className="w-5 h-5" />
                <span className="text-sm">Share as Image</span>
              </button>
            )}
          </div>
        )}
        {card.note && (
          <div className={noteStyle({ dark: isDark })}>
            <NotepadText className="w-5 h-5 shrink-0" aria-hidden="true" />
            <p className="flex-1 min-w-0 break-words">
              {isNoteVisible ? card.note : <span className="opacity-70">Note hidden</span>}
            </p>
            <button
              type="button"
              className="cursor-pointer p-1 rounded hover:bg-black/10 transition-colors"
              onClick={() => setIsNoteVisible((visible) => !visible)}
              aria-label={isNoteVisible ? 'Hide note' : 'Show note'}
            >
              {isNoteVisible ? (
                <EyeOff className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Eye className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          </div>
        )}
      </div>
    </>
  )
}
