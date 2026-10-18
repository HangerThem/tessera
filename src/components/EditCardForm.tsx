import type { Card } from '../types/Card.type'

import { CardForm } from './CardForm'

interface EditCardFormProps {
  initialCard: Card
  onSave: (card: Card) => void
  onClose: () => void
}

export function EditCardForm({ initialCard, onSave, onClose }: EditCardFormProps) {
  return (
    <CardForm
      title="Edit Card"
      closeLabel="Close edit card form"
      initialCard={initialCard}
      onSave={onSave}
      onClose={onClose}
    />
  )
}
