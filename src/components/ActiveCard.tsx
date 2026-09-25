import { BarcodeFormat } from '@zxing/library'
import {
  BarcodeIcon,
  ChevronLeft,
  Copy,
  CreditCard,
  Edit,
  ImageUpIcon,
  // NotepadText,
  QrCodeIcon,
  ShareIcon,
  Star,
  Trash2,
  XIcon,
} from 'lucide-preact'
import { useEffect, useState } from 'preact/hooks'
import { tv } from 'tailwind-variants'

import type { Card } from '../types/Card.type'

import { activeCardId, deleteCard, editCardId, favoriteCard } from '../store'
import { formatBarcodeValue, renderBarcode } from '../utils/barcode'
import { contrastColor, isDarkColor } from '../utils/color'
import { formatToLabel } from '../utils/text'
import { BarcodeCanvas } from './BarcodeCanvas'
import { Button } from './ui/Button'
import { useFocusTrap } from '../hooks/useFocusTrap'

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

// const noteInputStyle = tv({
//   slots: {
//     root: 'flex items-center justify-center gap-2 px-2 py-3 rounded-lg',
//     input: 'outline-none w-full text-sm',
//   },
//   variants: {
//     dark: {
//       false: {
//         root: 'bg-neutral-900/20 border border-neutral-900/30',
//         input: 'text-black placeholder:text-black/50',
//       },
//       true: {
//         root: 'bg-neutral-50/20 border border-neutral-50/30',
//         input: 'text-white placeholder:text-white/50',
//       },
//     },
//   },
// })

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
  const [displayFormat, setDisplayFormat] = useState<'barcode' | 'qr'>('barcode')
  const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false)
  const isDark = isDarkColor(card.color ?? '#fff')
  // const { root: noteRootClass, input: noteInputClass } = noteInputStyle({ dark: isDark })
  const [canShareText, setCanShareText] = useState(false)
  const [canShareFiles, setCanShareFiles] = useState(false)
  const [justCopied, setJustCopied] = useState(false)
  const dialogRef = useFocusTrap<HTMLDivElement>(true)
  const confirmRef = useFocusTrap<HTMLDivElement>(isDeleteConfirmVisible)

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
        text: `${card.name}: ${formatBarcodeValue(card.barcodeFormat, card.barcodeValue)}`,
      })
    } catch (err) {
      if ((err as DOMException).name !== 'AbortError') console.error(err)
    }
  }

  const handleShareImage = async () => {
    const offscreen = document.createElement('canvas')
    const isQRCode = displayFormat === 'qr'
    const format = isQRCode
      ? BarcodeFormat[card.qrCodeFormat ?? card.barcodeFormat]
      : BarcodeFormat[card.barcodeFormat]

    renderBarcode({ element: offscreen, value: card.barcodeValue, format, isQRCode })

    const blob = await new Promise<Blob | null>((resolve) => offscreen.toBlob(resolve, 'image/png'))
    if (!blob) return

    const file = new File([blob], `${card.name}-${isQRCode ? 'qr' : 'barcode'}.png`, {
      type: 'image/png',
    })

    try {
      await navigator.share({
        title: card.name,
        text: formatBarcodeValue(card.barcodeFormat, card.barcodeValue),
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
    }
  }, [])

  return (
    <>
      {isDeleteConfirmVisible && (
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
                onClick={() => setIsDeleteConfirmVisible(false)}
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
          <button className="flex items-center gap-1 cursor-pointer" onClick={() => (activeCardId.value = null)}>
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
              onClick={() => setIsDeleteConfirmVisible(true)}
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
              <p className="text-xs text-neutral-500">
                {formatToLabel(BarcodeFormat[card.barcodeFormat])}
              </p>
            </div>
            <button aria-label={card.isFavorite ? 'Unmark as favorite' : 'Mark as favorite'} aria-pressed={card.isFavorite} onClick={() => favoriteCard(card.id)} className="cursor-pointer">
              <Star
                className={`w-5 h-5 text-black ${card.isFavorite ? 'fill-current' : 'fill-none'}`}
                aria-hidden="true"
              />
            </button>
          </div>
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
          <div>
            <div className="flex items-center justify-center">
              <BarcodeCanvas
                format={
                  displayFormat === 'barcode'
                    ? card.barcodeFormat
                    : (card.qrCodeFormat ?? card.barcodeFormat)
                }
                value={card.barcodeValue}
              />
            </div>
            <div className="flex items-center justify-between gap-2 mt-2">
              <p className="text-sm text-neutral-500 text-center font-mono select-none">
                {formatBarcodeValue(card.barcodeFormat, card.barcodeValue)}
              </p>
              <button onClick={handleCopy} className="cursor-pointer flex" aria-label="Copy card number">
                <Copy className="w-4 h-4 text-neutral-500" />
              </button>
              <span aria-live="polite" aria-atomic="true" className="sr-only">
                {justCopied ? 'Copied!' : ''}
              </span>
            </div>
          </div>
        </div>

        {(canShareText || canShareFiles) && (
          <div className="flex gap-2 w-full">
            {canShareText && (
              <button className={shareButtonStyle({ dark: isDark })} onClick={handleShareText}>
                <ShareIcon className="w-5 h-5" />
                <span className="text-sm">Share</span>
              </button>
            )}
            {canShareFiles && (
              <button className={shareButtonStyle({ dark: isDark })} onClick={handleShareImage}>
                <ImageUpIcon className="w-5 h-5" />
                <span className="text-sm">Share as Image</span>
              </button>
            )}
          </div>
        )}
        {/* TODO: Add note functionality */}
        {/* <div className={noteRootClass()}>
          <NotepadText className="w-5 h-5" />
          <input type="text" className={noteInputClass()} placeholder="Add a note..." />
        </div> */}
      </div>
    </>
  )
}
