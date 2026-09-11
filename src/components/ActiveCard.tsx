import { BarcodeIcon, CreditCard, NotepadText, QrCodeIcon, ShareIcon, Star } from 'lucide-preact'

import type { Card } from '../types/Card.type'

import { favoriteCard } from '../store'
import { formatBarcodeValue } from '../utils/barcode'
import { contrastColor } from '../utils/color'
import { RenderBarcode } from './BarcodeCanvas'
import { useState } from 'preact/hooks'
import { BarcodeFormat } from '@zxing/library'
import { formatToLabel } from '../utils/text'

interface ActiveCardProps {
  card: Card
}

export function ActiveCard({ card }: ActiveCardProps) {
  const [displayFormat, setDisplayFormat] = useState<'barcode' | 'qr'>('barcode')

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
          <div className="flex items-center justify-center p-2 rounded-lg"
            style={{
              backgroundColor: card.color ?? '#fff',
              color: card.color ? contrastColor(card.color) : '#000',
            }}
          >
            <CreditCard className="w-6 h-6" />
          </div>
          <div className="mr-auto">
            <p className="text-sm text-black font-bold">
              {card.name}
            </p>
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
          <button className="gap-2 cursor-pointer flex-1 flex items-center justify-center bg-neutral-50 text-black hover:text-white hover:bg-black p-1 rounded transition-colors" onClick={() => setDisplayFormat('qr')}>
            <QrCodeIcon className="w-5 h-5" />
            <span className="text-sm">
              QR Code
            </span>
          </button>
          <button className="gap-2 cursor-pointer flex-1 flex items-center justify-center bg-neutral-50 text-black hover:text-white hover:bg-black p-1 rounded transition-colors" onClick={() => setDisplayFormat('barcode')}>
            <BarcodeIcon className="w-5 h-5" />
            <span className="text-sm">
              Barcode
            </span>
          </button>
        </div>
        <div>
          <div className="flex items-center justify-center">
            <RenderBarcode format={displayFormat === 'barcode' ? card.barcodeFormat : card.qrCodeFormat ?? card.barcodeFormat} value={card.barcodeValue} />
          </div>
          <p className="text-sm text-black text-center font-mono">
            {formatBarcodeValue(card.barcodeFormat, card.barcodeValue)}
          </p>
        </div>
      </div>

      <button className="gap-2 cursor-pointer flex items-center justify-center bg-neutral-50/20 hover:bg-neutral-50/40 border border-neutral-50/50 py-4 rounded-lg transition-colors">
        <ShareIcon className="w-5 h-5" />
        <span className="text-sm">
          Share
        </span>
      </button>

      <div className="flex items-center justify-center gap-2 px-2 py-3 rounded-lg bg-neutral-50/20">
        <NotepadText className="w-5 h-5" />
        <input type="text" className="outline-none w-full text-sm" placeholder="Add a note..." />
      </div>
    </div>
  )
}
