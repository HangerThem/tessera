import type { Card } from '../types/Card.type'

import state from '../state'
import { renderBarcode } from './BarcodeCanvas'

export function CardItem(card: Card, index: number): HTMLElement {
  const el = document.createElement('div')
  el.className = 'card'
  el.dataset.cardId = card.id
  el.style.backgroundColor = card.color ?? '#fff'
  el.style.setProperty('--card-color', card.color ?? '#fff')
  el.style.setProperty('--index', String(index))

  el.addEventListener('click', (event) => {
    if ((event.target as HTMLElement).closest('button')) return
    state.activeCardId = state.activeCardId === card.id ? null : card.id
  })

  el.innerHTML = `
    <h2></h2>
		<p class="barcode-value">${card.barcodeValue}</p>
  `
  el.querySelector('h2')!.textContent = card.name

  const barcodeCanvas = renderBarcode(card)
  if (barcodeCanvas) el.insertBefore(barcodeCanvas, el.querySelector('p')!)

  el.querySelector('button')?.addEventListener('click', () => state.deleteCards([card.id]))

  return el
}
