/**
 * fuzzy.ts
 *
 * Lightweight fuzzy search for short strings / small datasets.
 * No dependencies. ~100 lines of logic.
 *
 * Strategy:
 *  - Bitap (shift-or) algorithm for typo-tolerant matching
 *  - Score based on: match distance, consecutive runs, prefix bonus
 *  - Results sorted by score descending
 */

export interface FuzzyResult<T> {
  item: T
  score: number
  /** The string value that was matched against */
  matched: string
}

export interface FuzzyOptions<T> {
  /**
   * Extract the string(s) to search from each item.
   * When multiple fields are returned, only the highest-scoring field
   * contributes to the item's final score.
   */
  keys: (item: T) => string | string[]
  /** Max edit distance (typos) allowed. Default: 1. Raise to 2 for more tolerance. */
  maxErrors?: number
  /** Minimum score threshold [0–1] to include in results. Default: 0. */
  threshold?: number
}

/**
 * Bitap (shift-or) algorithm for approximate string matching.
 * Returns the edit distance of the best match, or Infinity if no match within maxErrors.
 *
 * @param text - The text to search within.
 * @param pattern - The pattern to search for.
 * @param maxErrors - Maximum allowed edit distance (typos).
 * @returns The edit distance of the best match, or Infinity if no match found.
 */
function bitapSearch(text: string, pattern: string, maxErrors: number): number {
  const m = pattern.length
  if (m === 0) return 0
  if (m > 31) return Infinity // bitap works within word size; patterns this long won't appear in short strings anyway

  // Precompute bitmask for each character in the pattern
  const patternMask: Record<string, number> = {}
  for (let i = 0; i < m; i++) {
    patternMask[pattern[i]] ??= 0
    patternMask[pattern[i]] |= 1 << i
  }

  // DP over edit distance levels
  const state = Array.from({ length: maxErrors + 1 }, () => 0)
  const matchBit = 1 << (m - 1)

  for (let j = 0; j < text.length; j++) {
    const charMask = patternMask[text[j]] ?? 0
    let prev0 = state[0]
    state[0] = ((state[0] << 1) | 1) & charMask
    if (state[0] & matchBit) return 0

    for (let e = 1; e <= maxErrors; e++) {
      const prev = state[e]
      state[e] =
        (((state[e] << 1) | 1) & charMask) | // match or substitute
        (prev0 << 1) | // insert
        prev0 | // delete
        (prev << 1) // delete from pattern
      prev0 = prev
      if (state[e] & matchBit) return e
    }
  }

  return Infinity
}

/**
 * Score a match based on edit distance, prefix match, and consecutive runs.
 *
 * @param candidate - The candidate string being scored.
 * @param query - The search query string.
 * @param editDistance - The edit distance of the match.
 * @returns A score between 0 and 1, where higher is better.
 */
function scoreMatch(candidate: string, query: string, editDistance: number): number {
  const c = candidate.toLowerCase()
  const q = query.toLowerCase()

  // Base: penalise edit distance relative to query length
  const distancePenalty = editDistance / Math.max(q.length, 1)
  let score = 1 - distancePenalty * 0.5

  // Bonus: prefix match
  if (c.startsWith(q)) score += 0.3
  else if (c.includes(q)) score += 0.15

  // Bonus: consecutive character run (poor-man's LCS)
  let run = 0
  let maxRun = 0
  let ci = 0
  for (const ch of q) {
    while (ci < c.length && c[ci] !== ch) ci++
    if (ci < c.length) {
      run++
      maxRun = Math.max(maxRun, run)
      ci++
    } else run = 0
  }
  score += (maxRun / q.length) * 0.2

  // Penalty: much longer than the query (loose match)
  const lengthRatio = q.length / Math.max(c.length, 1)
  score *= 0.7 + 0.3 * lengthRatio

  return Math.min(score, 1)
}

/**
 * Fuzzy search an array of items by string keys.
 *
 * @param items - The array of items to search.
 * @param query - The search query string.
 * @param options - Options for extracting keys and scoring.
 * @returns An array of results with item, score, and matched string.
 */
export function fuzzySearch<T>(
  items: T[],
  query: string,
  options: FuzzyOptions<T>,
): FuzzyResult<T>[] {
  const q = query.trim().toLowerCase()
  if (!q) return []

  const maxErrors = options.maxErrors ?? 1
  const threshold = options.threshold ?? 0
  const results: FuzzyResult<T>[] = []

  for (const item of items) {
    const raw = options.keys(item)
    const candidates = Array.isArray(raw) ? raw : [raw]

    let bestScore = -Infinity
    let bestMatched = ''

    for (const candidate of candidates) {
      const c = candidate.toLowerCase()
      const dist = bitapSearch(c, q, maxErrors)
      if (dist === Infinity) continue
      const score = scoreMatch(c, q, dist)
      if (score > bestScore) {
        bestScore = score
        bestMatched = candidate
      }
    }

    if (bestScore >= threshold) {
      results.push({ item, score: bestScore, matched: bestMatched })
    }
  }

  return results.toSorted((a, b) => b.score - a.score)
}
