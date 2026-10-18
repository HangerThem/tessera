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
