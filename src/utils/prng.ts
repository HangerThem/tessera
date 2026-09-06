/**
 * Creates a pseudo-random number generator (PRNG) function.
 * If a seed is provided, the PRNG will produce a deterministic sequence of numbers.
 * If no seed is provided, a random seed will be generated.
 *
 * @param {number} [seed] - Optional seed for the PRNG.
 * @returns {() => number} A function that generates pseudo-random numbers between 0 and 1.
 */
export function createPRNG(seed?: number): () => number {
	let x = seed ?? (Math.random() * 0x80000000) | 0
	return () => {
		x ^= x << 13
		x ^= x >> 17
		x ^= x << 5
		return (x >>> 0) / 0xffffffff
	}
}