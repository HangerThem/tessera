import { render } from 'preact'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Card } from '../types/Card.type'

import { BarcodeFormat, QRCodeFormat } from '../enums/codeFormats'
import { CardList } from './CardList'

vi.mock('../store', () => ({
  activeCardId: { value: null },
  favoriteCard: vi.fn(),
}))

const card = (name: string, isFavorite = false): Card => ({
  id: name,
  name,
  barcodeValue: '12345678',
  format: BarcodeFormat.CODE_128,
  isFavorite,
})

describe('CardList', () => {
  const container = document.createElement('div')

  afterEach(() => {
    render(null, container)
  })

  it('renders the cards on the first render, favourites first and then by name', () => {
    // Rendering without act() shows exactly what the first synchronous render produces.
    render(<CardList cards={[card('Lidl'), card('Tesco', true), card('Albert')]} />, container)

    const names = Array.from(container.querySelectorAll('li h2')).map((el) => el.textContent)
    expect(names).toEqual(['Tesco', 'Albert', 'Lidl'])
  })

  it('shows whether each card is a barcode or a QR code', () => {
    render(
      <CardList cards={[card('Albert'), { ...card('Gym'), format: QRCodeFormat.QR_CODE }]} />,
      container,
    )

    const [barcodeCard, qrCodeCard] = container.querySelectorAll('li')
    expect(barcodeCard.querySelector('.lucide-barcode')).not.toBeNull()
    expect(qrCodeCard.querySelector('.lucide-qr-code')).not.toBeNull()
    expect(container.querySelector('.lucide-credit-card')).toBeNull()
  })

  it('can sort by recently used: favourites still first, never used cards last by name', () => {
    const used = (name: string, lastUsedAt: number, isFavorite = false) => ({
      ...card(name, isFavorite),
      lastUsedAt,
    })
    render(
      <CardList
        sortOrder="recent"
        cards={[
          card('Zara'),
          used('Lidl', 100),
          card('Albert'),
          used('Tesco', 300),
          used('Gym', 50, true),
          used('Bakery', 200),
        ]}
      />,
      container,
    )

    const names = Array.from(container.querySelectorAll('li h2')).map((el) => el.textContent)
    expect(names).toEqual(['Gym', 'Tesco', 'Bakery', 'Lidl', 'Albert', 'Zara'])
  })
})
