import { BarcodeFormat } from '@zxing/library'
import { BarcodeIcon, CreditCard, NotepadText, QrCodeIcon, ShareIcon, Star } from 'lucide-preact'
import { useState } from 'preact/hooks'
import { tv } from 'tailwind-variants'

import type { Card } from '../types/Card.type'

import { favoriteCard } from '../store'
import { formatBarcodeValue } from '../utils/barcode'
import { contrastColor, isDarkColor } from '../utils/color'
import { formatToLabel } from '../utils/text'
import { RenderBarcode } from './BarcodeCanvas'

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

const noteInputStyle = tv({
  slots: {
    root: 'flex items-center justify-center gap-2 px-2 py-3 rounded-lg',
    input: 'outline-none w-full text-sm',
  },
  variants: {
    dark: {
      false: {
        root: 'bg-neutral-900/20 border border-neutral-900/30',
        input: 'text-black placeholder:text-black/50',
      },
      true: {
        root: 'bg-neutral-50/20 border border-neutral-50/30',
        input: 'text-white placeholder:text-white/50',
      },
    },
  },
})

const shareButtonStyle = tv({
  base: 'gap-2 cursor-pointer flex items-center justify-center bg-neutral-50/20 hover:bg-neutral-50/40 border border-neutral-50/50 py-4 rounded-lg transition-colors',
  variants: {
    dark: {
      false: 'bg-neutral-900/20 hover:bg-neutral-900/40 border border-neutral-900/30',
      true: 'bg-neutral-50/20 hover:bg-neutral-50/40 border border-neutral-50/30',
    },
  },
})

export function ActiveCard({ card }: ActiveCardProps) {
  const [displayFormat, setDisplayFormat] = useState<'barcode' | 'qr'>('barcode')
  const isDark = isDarkColor(card.color ?? '#fff')
  const { root: noteRootClass, input: noteInputClass } = noteInputStyle({ dark: isDark })

  return (
    <div
      className="z-999 fixed inset-0 p-3 overflow-hidden flex flex-col gap-4"
      style={{
        backgroundColor: card.color ?? '#fff',
        color: card.color ? contrastColor(card.color) : '#000',
      }}
    >
      <h1 className="text-2xl font-bold">Tessera</h1>
      <div className="flex flex-col gap-2 p-2 bg-white rounded-xl shadow">
        <div className="flex items-center gap-2 border-b border-neutral-200 pb-2">
          <div
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
          <button onClick={() => favoriteCard(card.id)} className="cursor-pointer">
            <Star
              className={`w-5 h-5 text-black ${card.isFavorite ? 'fill-current' : 'fill-none'}`}
            />
          </button>
        </div>
        <div className="flex gap-2 items-center justify-center p-2 rounded-lg bg-neutral-100">
          <button
            className={buttonStyle({ active: displayFormat === 'qr' })}
            onClick={() => setDisplayFormat('qr')}
          >
            <QrCodeIcon className="w-5 h-5" />
            <span className="text-sm">QR Code</span>
          </button>
          <button
            className={buttonStyle({ active: displayFormat === 'barcode' })}
            onClick={() => setDisplayFormat('barcode')}
          >
            <BarcodeIcon className="w-5 h-5" />
            <span className="text-sm">Barcode</span>
          </button>
        </div>
        <div>
          <div className="flex items-center justify-center">
            <RenderBarcode
              format={
                displayFormat === 'barcode'
                  ? card.barcodeFormat
                  : (card.qrCodeFormat ?? card.barcodeFormat)
              }
              value={card.barcodeValue}
            />
          </div>
          <p className="text-sm text-black text-center font-mono">
            {formatBarcodeValue(card.barcodeFormat, card.barcodeValue)}
          </p>
        </div>
      </div>
      <button className={shareButtonStyle({ dark: isDark })}>
        <ShareIcon className="w-5 h-5" />
        <span className="text-sm">Share</span>
      </button>

      <div className={noteRootClass()}>
        <NotepadText className="w-5 h-5" />
        <input type="text" className={noteInputClass()} placeholder="Add a note..." />
      </div>
    </div>
  )
}
