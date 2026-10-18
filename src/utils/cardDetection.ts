import type { Point } from './perspective'

type GrayImage = { data: Uint8ClampedArray; width: number; height: number }

type Line = { theta: number; rho: number; votes: number }

const THETA_STEPS = 180
/**
 * How far apart, in degrees, two lines can point and still be opposite sides of the card. Perspective
 * makes opposite sides converge, by over 25° for a card photographed at a steep angle.
 */
const PARALLEL_TOLERANCE = 30
/** The card must cover at least this share of the photo. */
const MIN_AREA = 0.15
/** A card is 85.6 × 54 mm (1.59). Perspective stretches that, so the range is generous. */
const MIN_ASPECT = 1.15
const MAX_ASPECT = 2.3
const CANDIDATES_PER_FAMILY = 8

/**
 * Finds the corners of a card in a photo: the strongest pair of roughly parallel lines in each of
 * two roughly perpendicular directions that encloses a card-shaped area. Works best when the card
 * stands out from a plain background; on a busy one it may miss, so callers let the user adjust.
 *
 * @param {GrayImage} image - The photo in grayscale, best around 400 px wide.
 * @returns {Point[] | null} The corners (top-left, top-right, bottom-right, bottom-left), or null.
 */
export function detectCardCorners(image: GrayImage): Point[] | null {
  const edges = findEdges(blur(image), image.width, image.height)
  const lines = findLines(edges, image.width, image.height)
  if (lines.length < 4) return null

  // The strongest line sets one direction; the card's other sides are roughly perpendicular.
  const [strongest] = lines
  const familyA = lines.filter(
    (line) => angleBetween(line.theta, strongest.theta) < PARALLEL_TOLERANCE,
  )
  const familyB = lines.filter(
    (line) => angleBetween(line.theta, strongest.theta + 90) < PARALLEL_TOLERANCE,
  )

  let best: { corners: Point[]; score: number } | null = null
  for (const [a1, a2] of pairs(familyA.slice(0, CANDIDATES_PER_FAMILY))) {
    for (const [b1, b2] of pairs(familyB.slice(0, CANDIDATES_PER_FAMILY))) {
      const corners = [intersect(a1, b1), intersect(a1, b2), intersect(a2, b1), intersect(a2, b2)]
      if (corners.some((corner) => corner === null)) continue
      const ordered = orderCorners(corners as Point[])
      if (!isCardShaped(ordered, image.width, image.height)) continue

      // Longer edges collect more votes, so this favours the card's outline over lines inside it.
      const score = a1.votes + a2.votes + b1.votes + b2.votes
      if (!best || score > best.score) best = { corners: ordered, score }
    }
  }
  return best?.corners ?? null
}

/** A 5×5 box blur, which keeps paper texture and sensor noise from becoming edges. */
function blur({ data, width, height }: GrayImage): Float32Array {
  const pass = (input: ArrayLike<number>, dx: number, dy: number) => {
    const output = new Float32Array(width * height)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0
        let count = 0
        for (let k = -2; k <= 2; k++) {
          const sx = x + k * dx
          const sy = y + k * dy
          if (sx < 0 || sy < 0 || sx >= width || sy >= height) continue
          sum += input[sy * width + sx]
          count++
        }
        output[y * width + x] = sum / count
      }
    }
    return output
  }
  return pass(pass(data, 1, 0), 0, 1)
}

/** Sobel edge detection, keeping only the strongest edges. */
function findEdges(pixels: Float32Array, width: number, height: number): Point[] {
  const magnitudes = new Float32Array(width * height)
  let max = 0
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const at = (dx: number, dy: number) => pixels[(y + dy) * width + x + dx]
      const gx = at(1, -1) + 2 * at(1, 0) + at(1, 1) - at(-1, -1) - 2 * at(-1, 0) - at(-1, 1)
      const gy = at(-1, 1) + 2 * at(0, 1) + at(1, 1) - at(-1, -1) - 2 * at(0, -1) - at(1, -1)
      const magnitude = Math.hypot(gx, gy)
      magnitudes[y * width + x] = magnitude
      if (magnitude > max) max = magnitude
    }
  }

  // A photo without strong edges (max well under a clear card edge) has nothing to find.
  const threshold = Math.max(40, max * 0.35)
  const edges: Point[] = []
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (magnitudes[y * width + x] >= threshold) edges.push({ x, y })
    }
  }
  return edges
}

/** A Hough transform: every edge pixel votes for each line through it; peaks are the lines. */
function findLines(edges: Point[], width: number, height: number): Line[] {
  const diagonal = Math.ceil(Math.hypot(width, height))
  const rhoSteps = diagonal * 2 + 1
  const votes = new Uint32Array(THETA_STEPS * rhoSteps)
  const cos = Array.from({ length: THETA_STEPS }, (_, t) => Math.cos((t * Math.PI) / THETA_STEPS))
  const sin = Array.from({ length: THETA_STEPS }, (_, t) => Math.sin((t * Math.PI) / THETA_STEPS))

  for (const { x, y } of edges) {
    for (let t = 0; t < THETA_STEPS; t++) {
      const rho = Math.round(x * cos[t] + y * sin[t]) + diagonal
      votes[t * rhoSteps + rho]++
    }
  }

  let maxVotes = 0
  for (const count of votes) if (count > maxVotes) maxVotes = count
  // A card side is long; shorter lines are text, patterns or noise.
  const minVotes = Math.max(30, maxVotes * 0.25)

  const lines: Line[] = []
  for (let t = 0; t < THETA_STEPS; t++) {
    for (let r = 0; r < rhoSteps; r++) {
      const count = votes[t * rhoSteps + r]
      if (count < minVotes || !isPeak(votes, t, r, rhoSteps)) continue
      lines.push({ theta: t, rho: r - diagonal, votes: count })
    }
  }
  return lines.toSorted((a, b) => b.votes - a.votes)
}

/** Whether a vote count is the highest in its neighbourhood, so each edge yields one line. */
function isPeak(votes: Uint32Array, t: number, r: number, rhoSteps: number): boolean {
  const count = votes[t * rhoSteps + r]
  for (let dt = -4; dt <= 4; dt++) {
    // Angles wrap around: 179° is next to 0°, with the distance flipped.
    let nt = t + dt
    let flip = false
    if (nt < 0) [nt, flip] = [nt + THETA_STEPS, true]
    if (nt >= THETA_STEPS) [nt, flip] = [nt - THETA_STEPS, true]
    for (let dr = -6; dr <= 6; dr++) {
      if (dt === 0 && dr === 0) continue
      const nr = flip ? rhoSteps - 1 - (r + dr) : r + dr
      if (nr < 0 || nr >= rhoSteps) continue
      const neighbour = votes[nt * rhoSteps + nr]
      // Ties go to the first, so a flat-topped peak still yields one line.
      if (neighbour > count || (neighbour === count && (dt < 0 || (dt === 0 && dr < 0)))) {
        return false
      }
    }
  }
  return true
}

const angleBetween = (a: number, b: number) => {
  const difference = Math.abs(a - b) % 180
  return Math.min(difference, 180 - difference)
}

/** Every pair of distinct lines that point roughly the same way, i.e. could be opposite sides. */
function* pairs(lines: Line[]): Generator<[Line, Line]> {
  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      if (angleBetween(lines[i].theta, lines[j].theta) < PARALLEL_TOLERANCE)
        yield [lines[i], lines[j]]
    }
  }
}

function intersect(a: Line, b: Line): Point | null {
  const [ta, tb] = [(a.theta * Math.PI) / THETA_STEPS, (b.theta * Math.PI) / THETA_STEPS]
  const determinant = Math.cos(ta) * Math.sin(tb) - Math.sin(ta) * Math.cos(tb)
  if (Math.abs(determinant) < 1e-6) return null
  return {
    x: (a.rho * Math.sin(tb) - b.rho * Math.sin(ta)) / determinant,
    y: (b.rho * Math.cos(ta) - a.rho * Math.cos(tb)) / determinant,
  }
}

/** Orders corners clockwise from the top-left one. */
function orderCorners(corners: Point[]): Point[] {
  const centre = {
    x: corners.reduce((sum, c) => sum + c.x, 0) / 4,
    y: corners.reduce((sum, c) => sum + c.y, 0) / 4,
  }
  const clockwise = corners.toSorted(
    (a, b) =>
      Math.atan2(a.y - centre.y, a.x - centre.x) - Math.atan2(b.y - centre.y, b.x - centre.x),
  )
  // Top-left is the corner closest to the image's top-left, i.e. with the smallest x + y.
  const start = clockwise.reduce(
    (best, corner, i) => (corner.x + corner.y < clockwise[best].x + clockwise[best].y ? i : best),
    0,
  )
  return [...clockwise.slice(start), ...clockwise.slice(0, start)]
}

function isCardShaped(corners: Point[], width: number, height: number): boolean {
  const margin = Math.min(width, height) * 0.05
  if (
    corners.some(
      ({ x, y }) => x < -margin || y < -margin || x > width + margin || y > height + margin,
    )
  ) {
    return false
  }

  // Convex: every turn goes the same way.
  const turns = corners.map((corner, i) => {
    const next = corners[(i + 1) % 4]
    const after = corners[(i + 2) % 4]
    return (next.x - corner.x) * (after.y - next.y) - (next.y - corner.y) * (after.x - next.x)
  })
  if (!turns.every((turn) => turn > 0) && !turns.every((turn) => turn < 0)) return false

  // Shoelace formula.
  const area =
    Math.abs(
      corners.reduce((sum, corner, i) => {
        const next = corners[(i + 1) % 4]
        return sum + corner.x * next.y - next.x * corner.y
      }, 0),
    ) / 2
  if (area < MIN_AREA * width * height) return false

  const side = (i: number) => {
    const [a, b] = [corners[i], corners[(i + 1) % 4]]
    return Math.hypot(b.x - a.x, b.y - a.y)
  }
  const across = (side(0) + side(2)) / 2
  const down = (side(1) + side(3)) / 2
  const aspect = Math.max(across, down) / Math.min(across, down)
  return aspect >= MIN_ASPECT && aspect <= MAX_ASPECT
}
