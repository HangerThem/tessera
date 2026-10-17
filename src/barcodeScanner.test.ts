import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { CameraError, CameraState } from './types/Camera.type'

import { BarcodeScanner } from './barcodeScanner'
import { BarcodeFormat, QRCodeFormat } from './enums/codeFormats'

const zxing = vi.hoisted(() => ({
  callback: null as ((result: unknown, err?: unknown) => void) | null,
  stop: () => {},
}))

vi.mock('@zxing/browser', () => ({
  BrowserMultiFormatReader: class {
    async decodeFromStream(
      _stream: MediaStream,
      _video: HTMLVideoElement,
      callback: typeof zxing.callback,
    ) {
      zxing.callback = callback
      return { stop: zxing.stop }
    }
  },
}))

function createStream() {
  const track = { stop: vi.fn() }
  const stream = new MediaStream()
  stream.getTracks = () => [track] as unknown as MediaStreamTrack[]
  return { stream, track }
}

function createVideo(play: () => Promise<void> = () => Promise.resolve()) {
  const video = document.createElement('video')
  video.play = vi.fn(play)
  return video
}

function mockGetUserMedia(impl: () => Promise<MediaStream>) {
  const getUserMedia = vi.fn(impl)
  Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true })
  return getUserMedia
}

function createScanner() {
  const states: CameraState[] = []
  const onDetect = vi.fn()
  const onStateChange = vi.fn((state: CameraState, _error?: CameraError) => states.push(state))
  const scanner = new BarcodeScanner({ onDetect, onStateChange })
  return { scanner, states, onDetect, onStateChange }
}

const lastError = (onStateChange: ReturnType<typeof createScanner>['onStateChange']) =>
  onStateChange.mock.calls.at(-1)?.[1]

describe('BarcodeScanner', () => {
  beforeEach(() => {
    zxing.callback = null
    zxing.stop = vi.fn()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    Reflect.deleteProperty(navigator, 'mediaDevices')
  })

  it('requests the camera synchronously so iOS treats it as part of the user gesture', () => {
    const getUserMedia = mockGetUserMedia(() => new Promise(() => {}))
    const { scanner } = createScanner()

    scanner.start(createVideo())

    expect(getUserMedia).toHaveBeenCalledOnce()
  })

  it('goes from requesting to active once the video plays', async () => {
    const { stream } = createStream()
    mockGetUserMedia(async () => stream)
    const { scanner, states } = createScanner()
    const video = createVideo()

    await scanner.start(video)

    expect(states).toEqual(['requesting', 'active'])
    expect(scanner.isScanning).toBe(true)
    expect(video.srcObject).toBe(stream)
  })

  it('ignores start while already scanning', async () => {
    const getUserMedia = mockGetUserMedia(async () => createStream().stream)
    const { scanner } = createScanner()
    const video = createVideo()

    await scanner.start(video)
    await scanner.start(video)

    expect(getUserMedia).toHaveBeenCalledOnce()
  })

  it.each([
    ['NotAllowedError', 'denied', true],
    ['SecurityError', 'denied', true],
    ['NotFoundError', 'not-found', false],
    ['OverconstrainedError', 'not-found', false],
    ['NotReadableError', 'in-use', true],
    ['AbortError', 'in-use', true],
    ['SomethingElseError', 'unknown', true],
  ])('reports %s as a %s error', async (name, reason, retryable) => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mockGetUserMedia(() => Promise.reject(new DOMException('', name)))
    const { scanner, states, onStateChange } = createScanner()

    await scanner.start(createVideo())

    expect(states).toEqual(['requesting', 'error'])
    expect(lastError(onStateChange)).toMatchObject({ reason, retryable })
    expect(scanner.isScanning).toBe(false)
  })

  it('reports an unsupported error when the browser exposes no camera API', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { scanner, onStateChange } = createScanner()

    await scanner.start(createVideo())

    expect(scanner.cameraState).toBe('error')
    expect(lastError(onStateChange)).toMatchObject({ reason: 'unsupported', retryable: false })
  })

  it('times out and releases the camera when the video never starts playing', async () => {
    vi.useFakeTimers()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { stream, track } = createStream()
    mockGetUserMedia(async () => stream)
    const { scanner, onStateChange } = createScanner()
    const video = createVideo(() => new Promise(() => {}))

    const started = scanner.start(video)
    await vi.advanceTimersByTimeAsync(8000)
    await started

    expect(scanner.cameraState).toBe('error')
    expect(lastError(onStateChange)).toMatchObject({ reason: 'timeout', retryable: true })
    expect(track.stop).toHaveBeenCalled()
    expect(video.srcObject).toBeNull()
  })

  it('reports a start error instead of "denied" when iOS rejects video playback', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mockGetUserMedia(async () => createStream().stream)
    const { scanner, onStateChange } = createScanner()

    await scanner.start(createVideo(() => Promise.reject(new DOMException('', 'NotAllowedError'))))

    expect(lastError(onStateChange)).toMatchObject({ reason: 'timeout' })
  })

  it('can be retried after an error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const getUserMedia = mockGetUserMedia(() =>
      Promise.reject(new DOMException('', 'NotReadableError')),
    )
    const { scanner } = createScanner()
    const video = createVideo()

    await scanner.start(video)
    // The failed start kicked off loading ZXing; let it settle so the retry resolves the mocked module.
    await vi.dynamicImportSettled()
    getUserMedia.mockResolvedValueOnce(createStream().stream)
    await scanner.start(video)

    expect(scanner.cameraState).toBe('active')
  })

  it('releases a stream that arrives after stop was called', async () => {
    const { stream, track } = createStream()
    let resolveStream!: (stream: MediaStream) => void
    mockGetUserMedia(() => new Promise((resolve) => (resolveStream = resolve)))
    const { scanner, states } = createScanner()
    const video = createVideo()

    const started = scanner.start(video)
    scanner.stop()
    resolveStream(stream)
    await started

    expect(track.stop).toHaveBeenCalled()
    expect(video.srcObject).toBeNull()
    expect(states).toEqual(['requesting', 'idle'])
  })

  it('stops the camera tracks on stop', async () => {
    const { stream, track } = createStream()
    mockGetUserMedia(async () => stream)
    const { scanner } = createScanner()
    const video = createVideo()

    await scanner.start(video)
    scanner.stop()

    expect(track.stop).toHaveBeenCalled()
    expect(video.srcObject).toBeNull()
    expect(scanner.cameraState).toBe('idle')
  })

  describe('with ZXing', () => {
    it('reports the detected value and stops scanning', async () => {
      const { stream, track } = createStream()
      mockGetUserMedia(async () => stream)
      const { scanner, onDetect } = createScanner()

      await scanner.start(createVideo())
      zxing.callback?.({
        getText: () => '4006381333931',
        getBarcodeFormat: () => BarcodeFormat.EAN_13,
      })

      expect(onDetect).toHaveBeenCalledWith('4006381333931', BarcodeFormat.EAN_13)
      expect(zxing.stop).toHaveBeenCalled()
      expect(track.stop).toHaveBeenCalled()
      expect(scanner.cameraState).toBe('idle')
    })
  })

  describe('with the native BarcodeDetector', () => {
    it('reports the detected value and stops scanning', async () => {
      const { stream, track } = createStream()
      mockGetUserMedia(async () => stream)
      vi.stubGlobal(
        'BarcodeDetector',
        class {
          detect = async () => [{ rawValue: '4006381333931', format: 'ean_13' }]
        },
      )
      const { scanner, onDetect } = createScanner()

      await scanner.start(createVideo())

      await vi.waitFor(() => expect(onDetect).toHaveBeenCalled())
      expect(onDetect.mock.calls[0][0]).toBe('4006381333931')
      expect(track.stop).toHaveBeenCalled()
      expect(scanner.cameraState).toBe('idle')
    })

    it('reports the format as a ZXing format', async () => {
      mockGetUserMedia(async () => createStream().stream)
      vi.stubGlobal(
        'BarcodeDetector',
        class {
          detect = async () => [{ rawValue: 'https://example.com', format: 'qr_code' }]
        },
      )
      const { scanner, onDetect } = createScanner()

      await scanner.start(createVideo())

      await vi.waitFor(() => expect(onDetect).toHaveBeenCalled())
      expect(onDetect).toHaveBeenCalledWith('https://example.com', QRCodeFormat.QR_CODE)
    })
  })
})
