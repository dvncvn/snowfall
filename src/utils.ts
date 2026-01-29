/**
 * Utility functions
 */

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

/**
 * Simple 2D Perlin-like noise using permutation table
 * Based on improved Perlin noise algorithm
 */
class PerlinNoise {
  private perm: number[] = []
  
  constructor(seed = Math.random() * 10000) {
    // Initialize permutation table
    const p: number[] = []
    for (let i = 0; i < 256; i++) p[i] = i
    
    // Shuffle with seed
    let n = seed
    for (let i = 255; i > 0; i--) {
      n = (n * 16807) % 2147483647
      const j = n % (i + 1)
      ;[p[i], p[j]] = [p[j]!, p[i]!]
    }
    
    // Duplicate for overflow
    this.perm = [...p, ...p]
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10)
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 3
    const u = h < 2 ? x : y
    const v = h < 2 ? y : x
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v)
  }

  noise2D(x: number, y: number): number {
    const X = Math.floor(x) & 255
    const Y = Math.floor(y) & 255
    
    x -= Math.floor(x)
    y -= Math.floor(y)
    
    const u = this.fade(x)
    const v = this.fade(y)
    
    const A = this.perm[X]! + Y
    const B = this.perm[X + 1]! + Y
    
    return lerp(
      lerp(this.grad(this.perm[A]!, x, y), this.grad(this.perm[B]!, x - 1, y), u),
      lerp(this.grad(this.perm[A + 1]!, x, y - 1), this.grad(this.perm[B + 1]!, x - 1, y - 1), u),
      v
    )
  }
}

// Global noise instance
let noiseInstance: PerlinNoise | null = null

export function noise2D(x: number, y: number): number {
  if (!noiseInstance) {
    noiseInstance = new PerlinNoise()
  }
  return noiseInstance.noise2D(x, y)
}

export function reseedNoise(seed?: number): void {
  noiseInstance = new PerlinNoise(seed)
}
