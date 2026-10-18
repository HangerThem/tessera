import type { Card } from '../types/Card.type'

import { CardForm } from './CardForm'

interface Props {
  onSave: (card: Card) => void
  onClose: () => void
}

export function AddCardForm({ onSave, onClose }: Props) {
  return (
    <CardForm title="New Card" closeLabel="Close add card form" onSave={onSave} onClose={onClose} />
  )
}
