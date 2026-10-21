import { fireEvent, render, screen, waitFor } from '@testing-library/preact'
import { describe, expect, it, vi } from 'vitest'

import { BarcodeFormat } from '../enums/codeFormats'
import { CardForm } from './CardForm'

describe('CardForm before bwip-js has loaded', () => {
  it('still checks the value when saved straight away', async () => {
    const onSave = vi.fn(async () => {})
    render(<CardForm title="New Card" closeLabel="Close" onSave={onSave} onClose={() => {}} />)
    fireEvent.input(screen.getByLabelText('Card name'), { target: { value: 'Grocery' } })
    fireEvent.input(screen.getByLabelText('Barcode number'), { target: { value: '12345' } })
    fireEvent.change(screen.getByLabelText('Barcode format'), {
      target: { value: String(BarcodeFormat.EAN_13) },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Save Card' }))

    expect(await screen.findByText(/EAN-13 must be 12 or 13 digits/)).toBeTruthy()
    await waitFor(() => expect(onSave).not.toHaveBeenCalled())
  })
})
