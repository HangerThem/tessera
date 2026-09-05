import type { Card } from '../types/Card.type'

import { BarcodeScanner } from '../barcodeScanner'
import { BarcodeFormat } from '../enums/barcode'

const PRESET_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
]

function formatToLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/\w\S*/g, (w) => w[0] + w.slice(1).toLowerCase())
}

export function AddCardForm(
  container: HTMLElement,
  onSubmit: (card: Card) => void,
  onClose?: () => void,
) {
  let selectedColor: string | undefined = PRESET_COLORS[0]

  container.innerHTML = `
    <div class="form-header">
      <h2>New Card</h2>
      <button type="button" class="form-close-btn" aria-label="Close">
        <i data-lucide="x"></i>
      </button>
    </div>

    <div class="form-field">
      <label for="card-name">Card name</label>
      <input type="text" id="card-name" placeholder="e.g. IKEA Family" autocomplete="off" required />
    </div>

    <div class="form-field">
      <label for="card-barcode-value">Barcode number</label>
      <input type="text" id="card-barcode-value" placeholder="e.g. 123456789" autocomplete="off" required />
    </div>

    <div class="form-field">
      <label for="card-barcode-format">Barcode format</label>
      <select id="card-barcode-format" required>
        <option value="" disabled selected>Select format</option>
        ${Object.keys(BarcodeFormat)
      .filter((key) => isNaN(Number(key)))
      .map(
        (key) =>
          `<option value="${BarcodeFormat[key as keyof typeof BarcodeFormat]}">${formatToLabel(key)}</option>`,
      )
      .join('')}
      </select>
    </div>

    <div class="form-field">
      <label>Card colour</label>
      <div class="color-picker-row" id="color-picker-row">
        ${PRESET_COLORS.map(
        (c, i) =>
          `<button type="button" class="color-swatch${i === 0 ? ' active' : ''}" data-color="${c}" style="background-color:${c};" aria-label="${c}"></button>`,
      ).join('')}
        <button type="button" class="color-swatch color-swatch-custom" aria-label="Custom colour">
          <input type="color" id="card-color-custom" tabindex="-1" />
        </button>
      </div>
    </div>

    <div class="scan-section">
      <button type="button" id="scan-barcode" class="btn-secondary">
        <i data-lucide="scan-barcode"></i>
        Scan Barcode
      </button>
      <video id="scan-video" playsinline muted></video>
      <p class="scan-error" id="scan-error"></p>
    </div>

    <div class="form-actions">
      <button type="button" id="submit-card" class="btn-primary">Save Card</button>
    </div>
  `

  const nameInput = container.querySelector<HTMLInputElement>('#card-name')!
  const barcodeValueInput = container.querySelector<HTMLInputElement>('#card-barcode-value')!
  const barcodeFormatSelect = container.querySelector<HTMLSelectElement>('#card-barcode-format')!
  const colorPickerRow = container.querySelector<HTMLDivElement>('#color-picker-row')!
  const customColorInput = container.querySelector<HTMLInputElement>('#card-color-custom')!
  const scanButton = container.querySelector<HTMLButtonElement>('#scan-barcode')!
  const submitButton = container.querySelector<HTMLButtonElement>('#submit-card')!
  const closeButton = container.querySelector<HTMLButtonElement>('.form-close-btn')!
  const video = container.querySelector<HTMLVideoElement>('#scan-video')!
  const errorEl = container.querySelector<HTMLParagraphElement>('#scan-error')!

  colorPickerRow.addEventListener('click', (e) => {
    const swatch = (e.target as HTMLElement).closest<HTMLButtonElement>('.color-swatch')
    if (!swatch || swatch.classList.contains('color-swatch-custom')) return
    colorPickerRow.querySelectorAll('.color-swatch').forEach((s) => s.classList.remove('active'))
    swatch.classList.add('active')
    selectedColor = swatch.dataset.color
  })

  customColorInput.addEventListener('input', () => {
    colorPickerRow.querySelectorAll('.color-swatch').forEach((s) => s.classList.remove('active'))
    customColorInput.closest('.color-swatch')!.classList.add('active')
    selectedColor = customColorInput.value
  })

  const scanner = new BarcodeScanner(video, {
    onDetect: (value, format) => {
      barcodeValueInput.value = value
      barcodeFormatSelect.value = String(format)
      video.style.display = 'none'
      scanButton.textContent = 'Scan Barcode'
      scanButton.classList.remove('scanning')
    },
    onError: (message) => {
      errorEl.textContent = message
      video.style.display = 'none'
      scanButton.textContent = 'Scan Barcode'
      scanButton.classList.remove('scanning')
    },
  })

  scanButton.addEventListener('click', async () => {
    if (scanner.isScanning) {
      scanner.stop()
      video.style.display = 'none'
      scanButton.innerHTML = `
        <i data-lucide="scan-barcode"></i>
        Scan Barcode`
      scanButton.classList.remove('scanning')
      return
    }
    errorEl.textContent = ''
    video.style.display = 'block'
    scanButton.textContent = 'Stop Scanning'
    scanButton.classList.add('scanning')
    await scanner.start()
  })

  submitButton.addEventListener('click', () => {
    if (!nameInput.value || !barcodeValueInput.value || !barcodeFormatSelect.value) {
      ;[nameInput, barcodeValueInput, barcodeFormatSelect].forEach((el) => {
        if (!el.value) el.style.borderColor = '#e05858'
      })
      return
    }

    onSubmit({
      id: crypto.randomUUID(),
      name: nameInput.value,
      barcodeValue: barcodeValueInput.value,
      barcodeFormat: Number(barcodeFormatSelect.value) as BarcodeFormat,
      color: selectedColor,
    })
    onClose?.()

    scanner.stop()
    container
      .querySelectorAll('input, select')
      .forEach((el) => ((el as HTMLInputElement).value = ''))
    selectedColor = PRESET_COLORS[0]
    colorPickerRow
      .querySelectorAll('.color-swatch')
      .forEach((s, i) => s.classList.toggle('active', i === 0))
  })

    ;[nameInput, barcodeValueInput, barcodeFormatSelect].forEach((el) => {
      el.addEventListener('input', () => (el.style.borderColor = ''))
    })

  closeButton.addEventListener('click', () => {
    scanner.stop()
    onClose?.()
  })
}
