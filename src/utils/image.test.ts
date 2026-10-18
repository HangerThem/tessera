import { describe, expect, it } from 'vitest'

import { blobToDataUrl, cardOutputSize, dataUrlToBlob, defaultCorners, fitWithin } from './image'

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

describe('cardOutputSize', () => {
  it('is 1000 × 630, the shape of a card, for a card held sideways', () => {
    const corners = [
      { x: 10, y: 20 },
      { x: 410, y: 30 },
      { x: 400, y: 280 },
      { x: 0, y: 260 },
    ]

    expect(cardOutputSize(corners)).toEqual({ width: 1000, height: 630 })
  })

  it('is 630 × 1000 for a card held upright', () => {
    const corners = [
      { x: 20, y: 10 },
      { x: 280, y: 0 },
      { x: 270, y: 400 },
      { x: 30, y: 410 },
    ]

    expect(cardOutputSize(corners)).toEqual({ width: 630, height: 1000 })
  })
})

describe('defaultCorners', () => {
  it('starts just inside the edges of the photo, for the user to adjust', () => {
    expect(defaultCorners(1000, 500)).toEqual([
      { x: 80, y: 40 },
      { x: 920, y: 40 },
      { x: 920, y: 460 },
      { x: 80, y: 460 },
    ])
  })
})
