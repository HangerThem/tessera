import { act, cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { BarcodeScannerOptions } from '../barcodeScanner'
import type { CameraError } from '../types/Camera.type'

import { BarcodeFormat } from '../enums/codeFormats'
import { AddCardForm } from './AddCardForm'

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

const deniedError: CameraError = {
  reason: 'denied',
  title: 'Camera access blocked',
  message: 'Allow camera access, then try again.',
  retryable: true,
}

const barcodeInput = () => screen.queryByLabelText('Barcode number') as HTMLInputElement | null

function renderForm() {
  const onSave = vi.fn()
  const onClose = vi.fn()
  render(<AddCardForm onSave={onSave} onClose={onClose} />)
  return { onSave, onClose }
}

function startScanning() {
  fireEvent.click(screen.getByRole('button', { name: 'Scan Barcode' }))
  return scanners[0]
}

describe('AddCardForm camera flow', () => {
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

  it('shows the error and falls back to manual entry with the barcode field focused', () => {
    renderForm()
    const scanner = startScanning()

    act(() => scanner.options.onStateChange?.('error', deniedError))
    expect(screen.getByRole('alert').textContent).toContain(deniedError.title)

    fireEvent.click(screen.getByRole('button', { name: 'Enter code manually' }))

    expect(scanner.stop).toHaveBeenCalled()
    expect(barcodeInput()).not.toBeNull()
    expect(document.activeElement).toBe(barcodeInput())
  })

  it('focuses an input during the manual entry tap so iOS opens the keyboard', () => {
    renderForm()
    const scanner = startScanning()
    act(() => scanner.options.onStateChange?.('error', deniedError))

    // Runs after the button's click handler but before the rerender, i.e. still inside the user gesture.
    let focusedDuringTap: Element | null = null
    const captureFocus = () => (focusedDuringTap = document.activeElement)
    document.addEventListener('click', captureFocus)
    fireEvent.click(screen.getByRole('button', { name: 'Enter code manually' }))
    document.removeEventListener('click', captureFocus)

    expect(focusedDuringTap).toBeInstanceOf(HTMLInputElement)
  })

  it('retries the camera from the error state', () => {
    renderForm()
    const scanner = startScanning()
    act(() => scanner.options.onStateChange?.('error', deniedError))

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(scanner.start).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('fills in the barcode and its format after a successful scan', () => {
    const { onSave } = renderForm()
    const scanner = startScanning()
    act(() => scanner.options.onStateChange?.('active'))

    act(() => {
      scanner.stop()
      scanner.options.onDetect('4006381333931', BarcodeFormat.EAN_13)
    })

    expect(barcodeInput()?.value).toBe('4006381333931')

    fireEvent.input(screen.getByLabelText('Card name'), { target: { value: 'Grocery' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Card' }))
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        barcodeValue: '4006381333931',
        barcodeFormat: BarcodeFormat.EAN_13,
      }),
    )
  })

  it('keeps the format of a scanned UPC-A card', () => {
    const { onSave } = renderForm()
    const scanner = startScanning()
    act(() => scanner.options.onStateChange?.('active'))

    act(() => {
      scanner.stop()
      scanner.options.onDetect('036000291452', BarcodeFormat.UPC_A)
    })
    fireEvent.input(screen.getByLabelText('Card name'), { target: { value: 'Grocery' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Card' }))

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ barcodeValue: '036000291452', barcodeFormat: BarcodeFormat.UPC_A }),
    )
  })

  it('warns when the scanned format is not supported', () => {
    renderForm()
    const scanner = startScanning()
    act(() => scanner.options.onStateChange?.('active'))

    act(() => {
      scanner.stop()
      scanner.options.onDetect('0101234567890128', undefined)
    })

    expect(barcodeInput()?.value).toBe('0101234567890128')
    expect(screen.getByRole('status').textContent).toBe(
      "Tessera can't show this barcode's format yet, so the card may not scan at checkout.",
    )

    fireEvent.input(barcodeInput()!, { target: { value: '12345678' } })
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('stops the camera when the form is closed', () => {
    const { onClose } = renderForm()
    const scanner = startScanning()

    fireEvent.click(screen.getByRole('button', { name: 'Close add card form' }))

    expect(scanner.stop).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })
})

describe('AddCardForm barcode validation', () => {
  afterEach(cleanup)

  it("doesn't save a barcode that doesn't fit its format, and says why", () => {
    const { onSave } = renderForm()
    fireEvent.input(screen.getByLabelText('Card name'), { target: { value: 'Grocery' } })
    fireEvent.change(screen.getByLabelText('Barcode format'), {
      target: { value: String(BarcodeFormat.EAN_13) },
    })
    fireEvent.input(barcodeInput()!, { target: { value: '12345' } })

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

describe('AddCardForm colour', () => {
  afterEach(cleanup)

  it('saves a new card in white unless another colour is picked', () => {
    const { onSave } = renderForm()
    expect(
      screen.getByRole('button', { name: 'Select colour White' }).getAttribute('aria-pressed'),
    ).toBe('true')

    fireEvent.input(screen.getByLabelText('Card name'), { target: { value: 'Grocery' } })
    fireEvent.input(barcodeInput()!, { target: { value: '12345678' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Card' }))

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ color: '#ffffff' }))
  })
})
