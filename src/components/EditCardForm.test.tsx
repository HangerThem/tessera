import { act, cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { BarcodeScannerOptions } from '../barcodeScanner'
import type { CameraError } from '../types/Camera.type'
import type { Card } from '../types/Card.type'

import { BarcodeFormat } from '../enums/codeFormats'
import { EditCardForm } from './EditCardForm'

const scanners = vi.hoisted(
  () => [] as { options: BarcodeScannerOptions; start: () => void; stop: () => void }[],
)

vi.mock('../barcodeScanner', () => ({
  BarcodeScanner: class {
    start = vi.fn(() => this.options.onStateChange?.('requesting'))
    stop = vi.fn(() => this.options.onStateChange?.('idle'))
    constructor(public options: BarcodeScannerOptions) {
      scanners.push(this)
    }
  },
}))

const card: Card = {
  id: 'card-1',
  name: 'Grocery',
  barcodeValue: '12345678',
  barcodeFormat: BarcodeFormat.CODE_128,
  isFavorite: false,
  color: '#3b82f6',
}

const inUseError: CameraError = {
  reason: 'in-use',
  title: 'Camera is busy',
  message: 'Close the other app and try again.',
  retryable: true,
}

const barcodeInput = () => screen.queryByLabelText('Barcode number') as HTMLInputElement | null

function renderForm() {
  const onSave = vi.fn()
  const onClose = vi.fn()
  render(<EditCardForm initialCard={card} onSave={onSave} onClose={onClose} />)
  return { onSave, onClose }
}

function startScanning() {
  fireEvent.click(screen.getByRole('button', { name: 'Scan Barcode' }))
  return scanners[0]
}

describe('EditCardForm camera flow', () => {
  afterEach(() => {
    cleanup()
    scanners.length = 0
  })

  it('replaces the form with the scanner while the camera starts', () => {
    renderForm()

    const scanner = startScanning()

    expect(scanner.start).toHaveBeenCalledOnce()
    expect(barcodeInput()).toBeNull()
    expect(screen.queryByRole('button', { name: 'Save Card' })).toBeNull()
    expect(screen.getByText('Starting camera…')).toBeTruthy()
  })

  it('falls back to manual entry with the existing barcode kept and focused', () => {
    renderForm()
    const scanner = startScanning()
    act(() => scanner.options.onStateChange?.('error', inUseError))

    fireEvent.click(screen.getByRole('button', { name: 'Enter code manually' }))

    expect(scanner.stop).toHaveBeenCalled()
    expect(barcodeInput()?.value).toBe(card.barcodeValue)
    expect(document.activeElement).toBe(barcodeInput())
  })

  it('focuses an input during the manual entry tap so iOS opens the keyboard', () => {
    renderForm()
    const scanner = startScanning()
    act(() => scanner.options.onStateChange?.('error', inUseError))

    // Runs after the button's click handler but before the rerender, i.e. still inside the user gesture.
    let focusedDuringTap: Element | null = null
    const captureFocus = () => (focusedDuringTap = document.activeElement)
    document.addEventListener('click', captureFocus)
    fireEvent.click(screen.getByRole('button', { name: 'Enter code manually' }))
    document.removeEventListener('click', captureFocus)

    expect(focusedDuringTap).toBeInstanceOf(HTMLInputElement)
  })

  it('replaces the barcode and its format after a successful scan', () => {
    const { onSave } = renderForm()
    const scanner = startScanning()
    act(() => scanner.options.onStateChange?.('active'))

    act(() => {
      scanner.stop()
      scanner.options.onDetect('4006381333931', BarcodeFormat.EAN_13)
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save Card' }))

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        id: card.id,
        barcodeValue: '4006381333931',
        barcodeFormat: BarcodeFormat.EAN_13,
      }),
    )
  })

  it('stops the camera when the form is closed', () => {
    const { onClose } = renderForm()
    const scanner = startScanning()

    fireEvent.click(screen.getByRole('button', { name: 'Close edit card form' }))

    expect(scanner.stop).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })
})

describe('EditCardForm barcode validation', () => {
  afterEach(cleanup)

  it("doesn't save a barcode that doesn't fit its format, and says why", () => {
    const { onSave } = renderForm()
    fireEvent.change(screen.getByLabelText('Barcode format'), {
      target: { value: String(BarcodeFormat.EAN_13) },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Save Card' }))

    expect(onSave).not.toHaveBeenCalled()
    expect(barcodeInput()?.getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByText(/EAN-13 must be 12 or 13 digits/)).toBeTruthy()

    fireEvent.input(barcodeInput()!, { target: { value: '4006381333931' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Card' }))

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        barcodeValue: '4006381333931',
        barcodeFormat: BarcodeFormat.EAN_13,
      }),
    )
  })
})
