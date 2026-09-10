import type { IScannerControls } from '@zxing/browser'
import type { BarcodeFormat } from './enums/codeFormats'

export interface BarcodeScannerOptions {
  formats?: BarcodeFormat[]
  onDetect: (value: string, format: BarcodeFormat) => void
  onError?: (message: string) => void
}

export class BarcodeScanner {
  private video: HTMLVideoElement
  private controls: IScannerControls | null = null
  private options: BarcodeScannerOptions

  constructor(video: HTMLVideoElement, options: BarcodeScannerOptions) {
    this.video = video
    this.options = options

    // oxlint-disable-next-line typescript/no-explicit-any
    console.warn = (...args: any[]) => {
      if (typeof args[0] === 'string' && args[0].startsWith('MultiFormatReader')) return
      console.log(...args)
    }
  }

  get isScanning(): boolean {
    return this.controls !== null
  }

  async start(): Promise<void> {
    if (this.controls) return

    const [{ BrowserMultiFormatReader }, { DecodeHintType, NotFoundException }] = await Promise.all([
      import('@zxing/browser'),
      import('@zxing/library'),
    ])

    const hints = new Map()
    hints.set(DecodeHintType.TRY_HARDER, true)
    if (this.options.formats?.length) {
      hints.set(DecodeHintType.POSSIBLE_FORMATS, this.options.formats)
    }

    const reader = new BrowserMultiFormatReader(hints)

    try {
      this.controls = await reader.decodeFromConstraints(
        { video: { facingMode: 'environment' } },
        this.video,
        (result, err) => {
          if (result) {
            this.options.onDetect(result.getText(), result.getBarcodeFormat() as BarcodeFormat)
            this.stop()
          }
          if (err && !(err instanceof NotFoundException)) {
            console.error(err)
          }
        },
      )
    } catch (e) {
      const message =
        e instanceof DOMException && e.name === 'NotAllowedError'
          ? 'Camera permission denied.'
          : 'Could not access camera.'
      this.options.onError?.(message)
    }
  }

  stop(): void {
    this.controls?.stop()
    this.controls = null
  }
}