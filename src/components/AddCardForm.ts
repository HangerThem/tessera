import type { Card } from '../types/Card.type'
import { BarcodeScanner } from '../barcodeScanner'
import { BarcodeFormat } from '@zxing/library'

const UNSUPPORTED_FORMATS = new Set([
	BarcodeFormat.CODABAR,
	BarcodeFormat.RSS_14,
	BarcodeFormat.RSS_EXPANDED,
	BarcodeFormat.UPC_A,
	BarcodeFormat.UPC_E,
	BarcodeFormat.UPC_EAN_EXTENSION,
])

const ALL_FORMAT_KEYS = Object.keys(BarcodeFormat).filter((key) => !isNaN(Number(BarcodeFormat[key as keyof typeof BarcodeFormat])) && !UNSUPPORTED_FORMATS.has(BarcodeFormat[key as keyof typeof BarcodeFormat]))

function formatToLabel(key: string): string {
	return key.replace(/_/g, ' ').replace(/\w\S*/g, (w) => w[0] + w.slice(1).toLowerCase())
}

export function AddCardForm(container: HTMLElement, onSubmit: (card: Card) => void) {
	container.innerHTML = `
		<form>
			<h2>Add a New Card</h2>
			<input type="text" id="card-name" placeholder="Card Name" required />
			<input type="text" id="card-barcode-value" placeholder="Barcode Value" required />
			<select id="card-barcode-format" required>
				<option value="">Select Barcode Format</option>
				${ALL_FORMAT_KEYS.map(
		(key) => `<option value="${BarcodeFormat[key as keyof typeof BarcodeFormat]}">${formatToLabel(key)}</option>`
	).join('')}
			</select>
			<input type="color" id="card-color" />
			<video id="scan-video" playsinline muted style="display:none; width:100%; max-width:480px;"></video>
			<p id="scan-error" style="color:red;"></p>
			<button type="submit">Add Card</button>
			<button type="button" id="scan-barcode">Scan Barcode</button>
		</form>
  `

	const form = container as HTMLFormElement

	const nameInput = form.querySelector<HTMLInputElement>('#card-name')!
	const barcodeValueInput = form.querySelector<HTMLInputElement>('#card-barcode-value')!
	const barcodeFormatSelect = form.querySelector<HTMLSelectElement>('#card-barcode-format')!
	const colorInput = form.querySelector<HTMLInputElement>('#card-color')!
	const scanButton = form.querySelector<HTMLButtonElement>('#scan-barcode')!
	const video = form.querySelector<HTMLVideoElement>('#scan-video')!
	const errorEl = form.querySelector<HTMLParagraphElement>('#scan-error')!

	const scanner = new BarcodeScanner(video, {
		onDetect: (value, format) => {
			barcodeValueInput.value = value
			barcodeFormatSelect.value = String(format)
			video.style.display = 'none'
			scanButton.textContent = 'Scan Barcode'
		},
		onError: (message) => {
			errorEl.textContent = message
			video.style.display = 'none'
			scanButton.textContent = 'Scan Barcode'
		},
	})

	scanButton.addEventListener('click', async () => {
		if (scanner.isScanning) {
			scanner.stop()
			video.style.display = 'none'
			scanButton.textContent = 'Scan Barcode'
			return
		}
		errorEl.textContent = ''
		video.style.display = 'block'
		scanButton.textContent = 'Stop Scan'
		await scanner.start()
	})

	form.addEventListener('submit', (event) => {
		event.preventDefault()

		onSubmit({
			id: crypto.randomUUID(),
			name: nameInput.value,
			barcodeValue: barcodeValueInput.value,
			barcodeFormat: Number(barcodeFormatSelect.value) as BarcodeFormat,
			color: colorInput.value || undefined,
		})

		scanner.stop()
		form.reset()
	})
}