import { act, cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { BarcodeScannerOptions } from '../barcodeScanner'
import { BarcodeFormat } from '../enums/codeFormats'
import type { CameraError } from '../types/Camera.type'
import { AddCardForm } from './AddCardForm'

const scanners = vi.hoisted(() => [] as { options: BarcodeScannerOptions; start: () => void; stop: () => void }[])

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
      expect.objectContaining({ barcodeValue: '4006381333931', barcodeFormat: BarcodeFormat.EAN_13 }),
    )
  })

  it('stops the camera when the form is closed', () => {
    const { onClose } = renderForm()
    const scanner = startScanning()

    fireEvent.click(screen.getByRole('button', { name: 'Close add card form' }))

    expect(scanner.stop).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })
})
