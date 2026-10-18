import { detectCardCorners } from './cardDetection'
import { type Point, warpPerspective } from './perspective'

/** Photos are stored at most this many pixels on their long side. */
export const PHOTO_MAX_SIZE = 1000
const PHOTO_QUALITY = 0.8

/**
 * Scales a size down so its long side is at most `max`, keeping the aspect ratio. Smaller sizes are
 * left as they are.
 */
export function fitWithin(width: number, height: number, max: number) {
  const scale = Math.min(1, max / Math.max(width, height))
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

/**
 * Shrinks a photo to at most 1000 px on its long side and re-encodes it as JPEG, so a phone photo
 * of several megabytes becomes a couple of hundred kilobytes. `createImageBitmap` also applies the
 * photo's EXIF orientation.
 *
 * @param {Blob} file - The chosen photo.
 * @returns {Promise<Blob>} The photo to store.
 */
export async function resizePhoto(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const { width, height } = fitWithin(bitmap.width, bitmap.height, PHOTO_MAX_SIZE)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error("Can't draw the photo")
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', PHOTO_QUALITY),
  )
  if (!blob) throw new Error("Can't encode the photo")
  return blob
}

/** Encodes a photo as a data URL, for backups. */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => resolve(reader.result as string))
    reader.addEventListener('error', () => reject(reader.error))
    reader.readAsDataURL(blob)
  })
}

/** Decodes a base64 data URL back into a photo. */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(',', 2)
  const type = /^data:([^;]+)/.exec(header)?.[1] ?? 'application/octet-stream'
  const bytes = Uint8Array.from(atob(data), (char) => char.charCodeAt(0))
  return new Blob([bytes], { type })
}

/** A cropped card is 1000 px on its long side, in the card's proportions (85.6 × 54 mm). */
const CARD_LONG_SIDE = 1000
const CARD_SHORT_SIDE = Math.floor((CARD_LONG_SIDE * 54) / 85.6)
/** Detection runs on a copy this size, which is plenty for finding edges and fast. */
const DETECTION_SIZE = 400
/** The source for cropping is capped, so a 12-megapixel photo doesn't need 50 MB of pixels. */
const CROP_SOURCE_MAX_SIZE = 2000
const DEFAULT_INSET = 0.08

/** Card-shaped output: landscape when the card's top and bottom are longer than its sides. */
export function cardOutputSize(corners: Point[]) {
  const side = (i: number) => {
    const [a, b] = [corners[i], corners[(i + 1) % 4]]
    return Math.hypot(b.x - a.x, b.y - a.y)
  }
  const isLandscape = side(0) + side(2) >= side(1) + side(3)
  return isLandscape
    ? { width: CARD_LONG_SIDE, height: CARD_SHORT_SIDE }
    : { width: CARD_SHORT_SIDE, height: CARD_LONG_SIDE }
}

/** Corners just inside the photo's edges, for when no card was found. */
export function defaultCorners(width: number, height: number): Point[] {
  const [dx, dy] = [width * DEFAULT_INSET, height * DEFAULT_INSET]
  return [
    { x: dx, y: dy },
    { x: width - dx, y: dy },
    { x: width - dx, y: height - dy },
    { x: dx, y: height - dy },
  ]
}

/** Decodes a chosen photo. `createImageBitmap` applies its EXIF orientation, like `<img>` does. */
export function loadPhoto(file: Blob): Promise<ImageBitmap> {
  return createImageBitmap(file)
}

/** Draws a bitmap onto a new canvas, scaled to fit within `maxSize`. */
function drawScaled(bitmap: ImageBitmap, maxSize: number) {
  const { width, height } = fitWithin(bitmap.width, bitmap.height, maxSize)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error("Can't draw the photo")
  context.drawImage(bitmap, 0, 0, width, height)
  return { canvas, context, scale: bitmap.width / width }
}

/**
 * Looks for the card in a photo, on a 400 px copy.
 *
 * @param {ImageBitmap} bitmap - The photo.
 * @returns {Point[] | null} The card's corners in the photo's pixels, or null if none was found.
 */
export function findCardInPhoto(bitmap: ImageBitmap): Point[] | null {
  const { canvas, context, scale } = drawScaled(bitmap, DETECTION_SIZE)
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height)
  const corners = detectCardCorners({ data, width: canvas.width, height: canvas.height })
  return corners?.map(({ x, y }) => ({ x: x * scale, y: y * scale })) ?? null
}

/**
 * Crops a photo to the card inside the given corners and straightens it into a card-shaped JPEG.
 *
 * @param {ImageBitmap} bitmap - The photo.
 * @param {Point[]} corners - The card's corners in the photo's pixels: top-left, top-right,
 *   bottom-right, bottom-left.
 * @returns {Promise<Blob>} The photo to store.
 */
export async function cropCard(bitmap: ImageBitmap, corners: Point[]): Promise<Blob> {
  const { canvas, context, scale } = drawScaled(bitmap, CROP_SOURCE_MAX_SIZE)
  const source = context.getImageData(0, 0, canvas.width, canvas.height)
  const { width, height } = cardOutputSize(corners)
  const pixels = warpPerspective(
    source,
    corners.map(({ x, y }) => ({ x: x / scale, y: y / scale })),
    width,
    height,
  )

  const output = document.createElement('canvas')
  output.width = width
  output.height = height
  const outputContext = output.getContext('2d')
  if (!outputContext) throw new Error("Can't draw the photo")
  outputContext.putImageData(
    new ImageData(pixels as Uint8ClampedArray<ArrayBuffer>, width, height),
    0,
    0,
  )

  const blob = await new Promise<Blob | null>((resolve) =>
    output.toBlob(resolve, 'image/jpeg', PHOTO_QUALITY),
  )
  if (!blob) throw new Error("Can't encode the photo")
  return blob
}
