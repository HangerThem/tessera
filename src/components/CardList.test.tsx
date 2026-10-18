import { render } from 'preact'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Card } from '../types/Card.type'

import { BarcodeFormat } from '../enums/codeFormats'
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
})
