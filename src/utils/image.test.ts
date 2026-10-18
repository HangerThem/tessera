import { describe, expect, it } from 'vitest'

import { blobToDataUrl, dataUrlToBlob, fitWithin } from './image'

describe('fitWithin', () => {
  it('scales the long side down to the limit, keeping the aspect ratio', () => {
    expect(fitWithin(4000, 3000, 1000)).toEqual({ width: 1000, height: 750 })
    expect(fitWithin(3000, 4000, 1000)).toEqual({ width: 750, height: 1000 })
  })

  it('leaves small images as they are', () => {
    expect(fitWithin(800, 600, 1000)).toEqual({ width: 800, height: 600 })
  })
})

describe('data URLs', () => {
  it('round-trips a photo through a data URL', async () => {
    const photo = new Blob([new Uint8Array([255, 216, 255, 0, 1, 2])], { type: 'image/jpeg' })

    const dataUrl = await blobToDataUrl(photo)
    expect(dataUrl).toMatch(/^data:image\/jpeg;base64,/)

    const restored = dataUrlToBlob(dataUrl)
    expect(restored.type).toBe('image/jpeg')
    expect(new Uint8Array(await restored.arrayBuffer())).toEqual(
      new Uint8Array([255, 216, 255, 0, 1, 2]),
    )
  })
})
