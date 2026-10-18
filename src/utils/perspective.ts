export type Point = { x: number; y: number }

/** A 3×3 projective transform, row by row, with the last entry fixed at 1. */
export type Homography = number[]

/**
 * Finds the projective transform that maps four points onto four others, e.g. the corners of a
 * flat rectangle onto the corners of a card photographed at an angle.
 *
 * @param {Point[]} from - Four points, in order (top-left, top-right, bottom-right, bottom-left).
 * @param {Point[]} to - Where each of them should end up.
 * @returns {Homography} The transform.
 */
export function getHomography(from: Point[], to: Point[]): Homography {
  // Each pair of points gives two equations in the eight unknowns h0..h7 (h8 = 1).
  const rows: number[][] = []
  for (let i = 0; i < 4; i++) {
    const { x, y } = from[i]
    const { x: u, y: v } = to[i]
    rows.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u])
    rows.push([0, 0, 0, x, y, 1, -v * x, -v * y, v])
  }
  return [...solve(rows), 1]
}

/** Solves a linear system given as augmented rows, by Gaussian elimination with pivoting. */
function solve(rows: number[][]): number[] {
  const n = rows.length
  for (let col = 0; col < n; col++) {
    let pivot = col
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(rows[row][col]) > Math.abs(rows[pivot][col])) pivot = row
    }
    ;[rows[col], rows[pivot]] = [rows[pivot], rows[col]]
    for (let row = 0; row < n; row++) {
      if (row === col) continue
      const factor = rows[row][col] / rows[col][col]
      for (let k = col; k <= n; k++) rows[row][k] -= factor * rows[col][k]
    }
  }
  return rows.map((row, i) => row[n] / row[i])
}

export function applyHomography(h: Homography, { x, y }: Point): Point {
  const w = h[6] * x + h[7] * y + h[8]
  return { x: (h[0] * x + h[1] * y + h[2]) / w, y: (h[3] * x + h[4] * y + h[5]) / w }
}

type RGBAImage = { data: Uint8ClampedArray; width: number; height: number }

/**
 * Flattens the area inside four corners of an image into a rectangle of the given size, e.g. a card
 * photographed at an angle into a straight, card-shaped image. Each output pixel is sampled from
 * the source with bilinear interpolation.
 *
 * @param {RGBAImage} source - The photo's pixels.
 * @param {Point[]} corners - The area to flatten, in source pixels: top-left, top-right,
 *   bottom-right, bottom-left.
 * @param {number} width - The output width.
 * @param {number} height - The output height.
 * @returns {Uint8ClampedArray} The output's RGBA pixels.
 */
export function warpPerspective(
  source: RGBAImage,
  corners: Point[],
  width: number,
  height: number,
): Uint8ClampedArray {
  const toSource = getHomography(
    [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: width, y: height },
      { x: 0, y: height },
    ],
    corners,
  )
  const output = new Uint8ClampedArray(width * height * 4)
  const { data, width: sourceWidth, height: sourceHeight } = source

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Pixel centres, so an exact copy maps each pixel onto itself.
      const { x: sx, y: sy } = applyHomography(toSource, { x: x + 0.5, y: y + 0.5 })
      const px = Math.min(Math.max(sx - 0.5, 0), sourceWidth - 1)
      const py = Math.min(Math.max(sy - 0.5, 0), sourceHeight - 1)
      const x0 = Math.floor(px)
      const y0 = Math.floor(py)
      const x1 = Math.min(x0 + 1, sourceWidth - 1)
      const y1 = Math.min(y0 + 1, sourceHeight - 1)
      const fx = px - x0
      const fy = py - y0

      const out = (y * width + x) * 4
      for (let channel = 0; channel < 4; channel++) {
        const top =
          data[(y0 * sourceWidth + x0) * 4 + channel] * (1 - fx) +
          data[(y0 * sourceWidth + x1) * 4 + channel] * fx
        const bottom =
          data[(y1 * sourceWidth + x0) * 4 + channel] * (1 - fx) +
          data[(y1 * sourceWidth + x1) * 4 + channel] * fx
        output[out + channel] = top * (1 - fy) + bottom * fy
      }
    }
  }
  return output
}
