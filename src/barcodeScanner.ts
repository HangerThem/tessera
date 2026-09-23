import type { IScannerControls } from '@zxing/browser'

import type { BarcodeFormat, QRCodeFormat } from './enums/codeFormats'
import { mapZXingFormatsToBarcodeDetectorFormats } from './utils/barcode'

export interface BarcodeScannerOptions {
  formats?: (BarcodeFormat | QRCodeFormat)[]
  onDetect: (value: string, format: (BarcodeFormat | QRCodeFormat)) => void
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

    if (("BarcodeDetector" in globalThis)) {
      const formats = mapZXingFormatsToBarcodeDetectorFormats(this.options.formats ?? [])
      const barcodeDetector = new BarcodeDetector(formats ? { formats } : {})

      try {
        this.controls = {
          stop: () => {
            (this.video.srcObject as MediaStream | null)?.getTracks().forEach((track) => track.stop())
            this.video.srcObject = null
          },
        }

        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        this.video.srcObject = stream
        await this.video.play()

        const detectLoop = async () => {
          if (!this.controls) return
          try {
            const barcodes = await barcodeDetector.detect(this.video)
            if (barcodes.length > 0) {
              this.options.onDetect(
                barcodes[0].rawValue,
                barcodes[0].format as unknown as BarcodeFormat | QRCodeFormat,
              )
              this.stop()
              return
            }
          } catch (err) {
            console.error(err)
          }
          setTimeout(detectLoop, 200)
        }

        detectLoop()
      } catch (e) {
        const message =
          e instanceof DOMException && e.name === 'NotAllowedError'
            ? 'Camera permission denied.'
            : 'Could not access camera.'
        this.options.onError?.(message)
      }
    } else {
      const [{ BrowserMultiFormatReader }, { DecodeHintType, NotFoundException }] = await Promise.all(
        [import('@zxing/browser'), import('@zxing/library')],
      )

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
  }

  stop(): void {
    (this.video.srcObject as MediaStream | null)?.getTracks().forEach((track) => track.stop())
    this.video.srcObject = null
  }
}
