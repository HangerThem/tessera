import { act, cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { BarcodeScannerOptions } from '../barcodeScanner'
import type { CameraError } from '../types/Camera.type'

import { BarcodeFormat, QRCodeFormat } from '../enums/codeFormats'
import { cropCard, findCardInPhoto, resizePhoto } from '../utils/image'
import { AddCardForm } from './AddCardForm'

const scanners = vi.hoisted(
  () => [] as { options: BarcodeScannerOptions; start: () => void; stop: () => void }[],
)

vi.mock('../utils/image', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../utils/image')>()),
  // happy-dom has no canvas, so drawing photos is faked.
  loadPhoto: vi.fn(async () => ({ width: 400, height: 200, close: () => {} })),
  findCardInPhoto: vi.fn(() => [
    { x: 40, y: 20 },
    { x: 360, y: 20 },
    { x: 360, y: 180 },
    { x: 40, y: 180 },
  ]),
  cropCard: vi.fn(async () => new Blob(['cropped'], { type: 'image/jpeg' })),
  resizePhoto: vi.fn(async () => new Blob(['resized'], { type: 'image/jpeg' })),
}))

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
        format: BarcodeFormat.EAN_13,
      }),
      undefined,
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
      expect.objectContaining({ barcodeValue: '036000291452', format: BarcodeFormat.UPC_A }),
      undefined,
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

  it('saves a scanned QR code card as a QR code', () => {
    const { onSave } = renderForm()
    const scanner = startScanning()
    act(() => scanner.options.onStateChange?.('active'))

    act(() => {
      scanner.stop()
      scanner.options.onDetect('https://example.com/member/123', QRCodeFormat.QR_CODE)
    })
    fireEvent.input(screen.getByLabelText('Card name'), { target: { value: 'Gym' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Card' }))

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ format: QRCodeFormat.QR_CODE }),
      undefined,
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
        format: BarcodeFormat.EAN_13,
      }),
      undefined,
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

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ color: '#ffffff' }), undefined)
  })
})

function fillIn() {
  fireEvent.input(screen.getByLabelText('Card name'), { target: { value: 'Grocery' } })
  fireEvent.input(barcodeInput()!, { target: { value: '12345678' } })
}

describe('AddCardForm note', () => {
  afterEach(cleanup)

  it('saves the note', () => {
    const { onSave } = renderForm()
    fillIn()
    fireEvent.input(screen.getByLabelText(/^Note/), { target: { value: '  PIN 1234 ' } })

    fireEvent.click(screen.getByRole('button', { name: 'Save Card' }))

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ note: 'PIN 1234' }), undefined)
  })

  it('saves no note when it is left empty', () => {
    const { onSave } = renderForm()
    fillIn()

    fireEvent.click(screen.getByRole('button', { name: 'Save Card' }))

    expect(onSave.mock.calls[0][0]).not.toHaveProperty('note')
  })

  it('limits the note to 200 characters', () => {
    renderForm()

    expect((screen.getByLabelText(/^Note/) as HTMLInputElement).maxLength).toBe(200)
  })
})

function choosePhoto() {
  Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:photo'), revokeObjectURL: vi.fn() })
  const chosen = new File(['big photo'], 'card.jpg', { type: 'image/jpeg' })
  const input = document.querySelector<HTMLInputElement>('input[type="file"]')!
  Object.defineProperty(input, 'files', { value: [chosen], configurable: true })
  fireEvent.change(input)
  return chosen
}

describe('AddCardForm photo', () => {
  afterEach(cleanup)

  it('crops the chosen photo to the card it found, and saves it with the card', async () => {
    const { onSave } = renderForm()
    fillIn()

    choosePhoto()
    expect(await screen.findByRole('button', { name: 'Top-left corner' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Use photo' }))
    expect(await screen.findByRole('img', { name: 'Card photo' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Save Card' }))

    expect(findCardInPhoto).toHaveBeenCalled()
    expect(vi.mocked(cropCard).mock.calls[0][1]).toEqual([
      { x: 40, y: 20 },
      { x: 360, y: 20 },
      { x: 360, y: 180 },
      { x: 40, y: 180 },
    ])
    expect(await (onSave.mock.calls[0][1] as Blob).text()).toBe('cropped')
  })

  it('can use the whole photo instead, resized', async () => {
    const { onSave } = renderForm()
    fillIn()

    const chosen = choosePhoto()
    fireEvent.click(await screen.findByRole('button', { name: 'Use whole photo' }))
    expect(await screen.findByRole('img', { name: 'Card photo' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Save Card' }))

    expect(resizePhoto).toHaveBeenCalledWith(chosen)
    expect(await (onSave.mock.calls[0][1] as Blob).text()).toBe('resized')
  })

  it('keeps the form as it was when cropping is cancelled', async () => {
    const { onSave } = renderForm()
    fillIn()

    choosePhoto()
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save Card' }))

    expect(screen.queryByRole('img', { name: 'Card photo' })).toBeNull()
    expect(onSave.mock.calls[0][1]).toBeUndefined()
  })
})
