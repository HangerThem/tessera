import type { IScannerControls } from '@zxing/browser'

import type { BarcodeFormat, QRCodeFormat } from './enums/codeFormats'
import type { CameraError, CameraState } from './types/Camera.type'

import {
  mapBarcodeDetectorFormatToZXing,
  mapZXingFormatsToBarcodeDetectorFormats,
} from './utils/barcode'

export interface BarcodeScannerOptions {
  formats?: (BarcodeFormat | QRCodeFormat)[]
  /** `format` is undefined when the detected format is not one the app supports. */
  onDetect: (value: string, format: BarcodeFormat | QRCodeFormat | undefined) => void
  onStateChange?: (state: CameraState, error?: CameraError) => void
}

/** iOS occasionally hands back a stream whose video never starts playing; give up after this long. */
const PLAYBACK_TIMEOUT_MS = 8000
const DETECT_INTERVAL_MS = 200

/** The stream was granted but the video never started playing (timeout or autoplay rejection). */
class CameraStartError extends Error {}
class CameraUnsupportedError extends Error {}

const loadZXing = () => Promise.all([import('@zxing/browser'), import('@zxing/library')])

/**
 * ZXing logs a "MultiFormatReader" warning for many video frames while scanning. Drops just those
 * warnings and returns a function that restores the original console.warn.
 */
function silenceZXingWarnings(): () => void {
  const originalWarn = console.warn
  console.warn = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].startsWith('MultiFormatReader')) return
    originalWarn(...args)
  }
  return () => {
    console.warn = originalWarn
  }
}

export class BarcodeScanner {
  private options: BarcodeScannerOptions
  private video: HTMLVideoElement | null = null
  private stream: MediaStream | null = null
  private controls: IScannerControls | null = null
  private detectTimer: ReturnType<typeof setTimeout> | undefined
  /** Incremented on every start/stop so async work from a superseded start can bail out. */
  private session = 0
  private state: CameraState = 'idle'
  private restoreConsoleWarn: (() => void) | null = null

  constructor(options: BarcodeScannerOptions) {
    this.options = options
  }

  get cameraState(): CameraState {
    return this.state
  }

  get isScanning(): boolean {
    return this.state === 'requesting' || this.state === 'active'
  }

  /**
   * Starts the camera and begins scanning. Call this directly from a user gesture (e.g. a click handler):
   * iOS Safari is stricter about camera access that is not triggered by the user.
   */
  async start(video: HTMLVideoElement): Promise<void> {
    if (this.isScanning) return

    const session = ++this.session
    this.video = video
    this.setState('requesting')

    if (!navigator.mediaDevices?.getUserMedia) {
      this.fail(session, new CameraUnsupportedError())
      return
    }

    const useNativeDetector = 'BarcodeDetector' in globalThis
    // Start downloading ZXing alongside the permission prompt, but don't await anything before getUserMedia.
    const zxing = useNativeDetector ? null : loadZXing()
    zxing?.catch(() => {})

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
      if (session !== this.session) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }
      this.stream = stream

      video.muted = true
      video.playsInline = true
      video.setAttribute('playsinline', '')
      video.srcObject = stream
      await withTimeout(
        video.play().catch(() => {
          throw new CameraStartError()
        }),
        PLAYBACK_TIMEOUT_MS,
      )
      if (session !== this.session) return

      if (zxing) {
        await this.detectWithZXing(session, stream, video, zxing)
      } else {
        this.detectWithBarcodeDetector(session, video)
      }
      if (session !== this.session) return

      this.setState('active')
    } catch (e) {
      this.fail(session, e)
    }
  }

  stop(): void {
    this.session++
    this.release()
    this.setState('idle')
  }

  private detectWithBarcodeDetector(session: number, video: HTMLVideoElement): void {
    const formats = mapZXingFormatsToBarcodeDetectorFormats(this.options.formats ?? [])
    const barcodeDetector = new BarcodeDetector(formats ? { formats } : {})

    const detectLoop = async () => {
      if (session !== this.session) return
      try {
        const barcodes = await barcodeDetector.detect(video)
        if (session !== this.session) return
        if (barcodes.length > 0) {
          this.handleDetect(
            barcodes[0].rawValue,
            mapBarcodeDetectorFormatToZXing(barcodes[0].format),
          )
          return
        }
      } catch (err) {
        console.error(err)
      }
      this.detectTimer = setTimeout(detectLoop, DETECT_INTERVAL_MS)
    }

    detectLoop()
  }

  private async detectWithZXing(
    session: number,
    stream: MediaStream,
    video: HTMLVideoElement,
    zxing: ReturnType<typeof loadZXing>,
  ): Promise<void> {
    const [{ BrowserMultiFormatReader }, { DecodeHintType, NotFoundException }] = await zxing
    if (session !== this.session) return

    const hints = new Map()
    hints.set(DecodeHintType.TRY_HARDER, true)
    if (this.options.formats?.length) {
      hints.set(DecodeHintType.POSSIBLE_FORMATS, this.options.formats)
    }

    const reader = new BrowserMultiFormatReader(hints)
    this.restoreConsoleWarn = silenceZXingWarnings()
    const controls = await reader.decodeFromStream(stream, video, (result, err) => {
      if (session !== this.session) return
      if (result) {
        this.handleDetect(result.getText(), result.getBarcodeFormat() as BarcodeFormat)
      }
      if (err && !(err instanceof NotFoundException)) {
        console.error(err)
      }
    })

    if (session !== this.session) {
      controls.stop()
      return
    }
    this.controls = controls
  }

  private handleDetect(value: string, format: BarcodeFormat | QRCodeFormat | undefined): void {
    this.stop()
    this.options.onDetect(value, format)
  }

  private fail(session: number, error: unknown): void {
    if (session !== this.session) return
    console.error(error)
    this.release()
    this.setState('error', toCameraError(error))
  }

  private release(): void {
    clearTimeout(this.detectTimer)
    this.restoreConsoleWarn?.()
    this.restoreConsoleWarn = null
    this.controls?.stop()
    this.controls = null
    this.stream?.getTracks().forEach((track) => track.stop())
    this.stream = null
    if (this.video) this.video.srcObject = null
  }

  private setState(state: CameraState, error?: CameraError): void {
    if (state === this.state && !error) return
    this.state = state
    this.options.onStateChange?.(state, error)
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new CameraStartError()), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

function toCameraError(error: unknown): CameraError {
  if (error instanceof CameraStartError) {
    return {
      reason: 'timeout',
      title: "Camera didn't start",
      message: "The camera didn't start properly. Try again, or enter the code manually.",
      retryable: true,
    }
  }

  if (error instanceof CameraUnsupportedError) {
    return {
      reason: 'unsupported',
      title: 'Camera not available',
      message: isIOS()
        ? "This browser can't use the camera here. Try opening Tessera in Safari, or enter the code manually."
        : "This browser can't use the camera here. You can enter the code manually instead.",
      retryable: false,
    }
  }

  const name = error instanceof DOMException ? error.name : ''
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return {
        reason: 'denied',
        title: 'Camera access blocked',
        message: isIOS()
          ? 'Allow camera access in Settings › Safari › Camera (or via "aA" › Website Settings in the address bar), then try again.'
          : "Allow camera access for this site in your browser's settings, then try again.",
        retryable: true,
      }
    case 'NotFoundError':
    case 'OverconstrainedError':
      return {
        reason: 'not-found',
        title: 'No camera found',
        message:
          "We couldn't find a camera on this device. You can enter the code manually instead.",
        retryable: false,
      }
    case 'NotReadableError':
    case 'AbortError':
      return {
        reason: 'in-use',
        title: 'Camera is busy',
        message: 'Another app may be using the camera. Close it and try again.',
        retryable: true,
      }
    default:
      return {
        reason: 'unknown',
        title: "Couldn't start the camera",
        message:
          'Something went wrong while starting the camera. Try again, or enter the code manually.',
        retryable: true,
      }
  }
}
