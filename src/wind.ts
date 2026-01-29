/**
 * Wind field using Perlin noise for organic motion
 */

import { noise2D } from './utils'

export interface WindConfig {
  strength: number      // 0-1, overall wind intensity
  turbulence: number    // noise frequency multiplier
  timeScale: number     // how fast the wind changes
}

const defaultConfig: WindConfig = {
  strength: 0.3,
  turbulence: 0.002,
  timeScale: 0.0003
}

let config = { ...defaultConfig }
let time = 0

/**
 * Get wind force at a position
 * Returns { x, y } force vector normalized to -1..1
 */
export function getWind(x: number, y: number): { x: number; y: number } {
  const nx = x * config.turbulence
  const ny = y * config.turbulence
  const nt = time * config.timeScale
  
  // Sample noise at slightly offset positions for x and y components
  const windX = noise2D(nx + nt, ny) * config.strength
  const windY = noise2D(nx, ny + nt + 100) * config.strength * 0.3 // less vertical variation
  
  return { x: windX, y: windY }
}

/**
 * Update wind time (call each frame)
 */
export function updateWind(delta: number): void {
  time += delta * 1000
}

/**
 * Set wind configuration
 */
export function setWindConfig(newConfig: Partial<WindConfig>): void {
  config = { ...config, ...newConfig }
}

/**
 * Get current wind config
 */
export function getWindConfig(): WindConfig {
  return { ...config }
}

/**
 * Reset wind time (for re-seeding)
 */
export function resetWind(): void {
  time = 0
}
