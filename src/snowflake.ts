/**
 * Snowflake particle system
 */

import { randomRange, clamp } from './utils'
import { getWind } from './wind'

export interface Snowflake {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
  age: number
  lifespan: number
  driftFactor: number  // how much wind affects this flake
  active: boolean
}

export interface SnowfallConfig {
  density: number           // flakes spawned per second
  minSize: number
  maxSize: number
  minSpeed: number
  maxSpeed: number
  minLifespan: number       // seconds
  maxLifespan: number
  fadeInDuration: number    // seconds for fade in
  fadeOutDuration: number   // seconds for fade out
}

const defaultConfig: SnowfallConfig = {
  density: 30,
  minSize: 2,
  maxSize: 16,
  minSpeed: 12,
  maxSpeed: 35,
  minLifespan: 10,
  maxLifespan: 18,
  fadeInDuration: 1.5,
  fadeOutDuration: 2.5
}

// Performance: max particles to prevent runaway memory
const MAX_PARTICLES = 500

export class SnowflakeSystem {
  private pool: Snowflake[] = []
  private config: SnowfallConfig
  private width = 0
  private height = 0
  private spawnAccumulator = 0
  private densityTime = 0  // for natural density variation

  constructor(config: Partial<SnowfallConfig> = {}) {
    this.config = { ...defaultConfig, ...config }
  }

  /**
   * Update canvas dimensions
   */
  resize(width: number, height: number): void {
    this.width = width
    this.height = height
  }

  /**
   * Create a new snowflake
   */
  private createFlake(): Snowflake {
    const size = randomRange(this.config.minSize, this.config.maxSize)
    const speed = randomRange(this.config.minSpeed, this.config.maxSpeed)
    
    // Smaller flakes are slower, affected more by wind
    const sizeFactor = (size - this.config.minSize) / (this.config.maxSize - this.config.minSize)
    const adjustedSpeed = speed * (0.5 + sizeFactor * 0.5)
    
    return {
      x: randomRange(0, this.width),
      y: randomRange(-50, -10),  // spawn above viewport
      vx: randomRange(-1, 1),    // gentle initial drift
      vy: adjustedSpeed,
      size,
      opacity: 0,
      age: 0,
      lifespan: randomRange(this.config.minLifespan, this.config.maxLifespan),
      driftFactor: 1 - sizeFactor * 0.5,  // smaller = more drift
      active: true
    }
  }

  /**
   * Get or create a flake from pool
   */
  private spawn(): Snowflake | null {
    // Try to reuse inactive flake
    const inactive = this.pool.find(f => !f.active)
    if (inactive) {
      const newFlake = this.createFlake()
      Object.assign(inactive, newFlake)
      return inactive
    }
    
    // Cap total particles for performance
    if (this.pool.length >= MAX_PARTICLES) {
      return null
    }
    
    // Create new flake
    const flake = this.createFlake()
    this.pool.push(flake)
    return flake
  }

  /**
   * Update all snowflakes
   */
  update(delta: number): void {
    const { fadeInDuration, fadeOutDuration } = this.config
    
    // Natural density variation using layered sine waves
    this.densityTime += delta
    const densityMod = 0.6 + 
      0.25 * Math.sin(this.densityTime * 0.15) +   // slow wave
      0.15 * Math.sin(this.densityTime * 0.4)      // faster wave
    
    // Spawn new flakes based on modulated density
    this.spawnAccumulator += delta * this.config.density * densityMod
    while (this.spawnAccumulator >= 1) {
      this.spawn()
      this.spawnAccumulator -= 1
    }

    // Update each flake
    for (const flake of this.pool) {
      if (!flake.active) continue

      flake.age += delta

      // Check lifespan
      if (flake.age >= flake.lifespan || flake.y > this.height + 50) {
        flake.active = false
        continue
      }

      // Get wind at position
      const wind = getWind(flake.x, flake.y)

      // Apply wind (very gentle effect for peaceful motion)
      flake.vx += wind.x * flake.driftFactor * 30 * delta
      flake.vy += wind.y * flake.driftFactor * 10 * delta

      // Dampen horizontal velocity (stronger damping = smoother)
      flake.vx *= 0.96

      // Clamp velocities (low max for calm movement)
      flake.vx = clamp(flake.vx, -20, 20)
      flake.vy = clamp(flake.vy, 8, 60)

      // Update position
      flake.x += flake.vx * delta
      flake.y += flake.vy * delta

      // Wrap horizontally
      if (flake.x < -20) flake.x = this.width + 20
      if (flake.x > this.width + 20) flake.x = -20

      // Calculate opacity based on age
      const remainingLife = flake.lifespan - flake.age
      if (flake.age < fadeInDuration) {
        // Fade in
        flake.opacity = flake.age / fadeInDuration
      } else if (remainingLife < fadeOutDuration) {
        // Fade out
        flake.opacity = remainingLife / fadeOutDuration
      } else {
        flake.opacity = 1
      }

      // Slight opacity variation based on size (smaller = more transparent)
      const sizeFactor = (flake.size - this.config.minSize) / (this.config.maxSize - this.config.minSize)
      flake.opacity *= 0.4 + sizeFactor * 0.6
    }
  }

  /**
   * Get all active flakes for rendering
   */
  getActiveFlakes(): readonly Snowflake[] {
    return this.pool.filter(f => f.active)
  }

  /**
   * Get active flake count
   */
  getActiveCount(): number {
    return this.pool.filter(f => f.active).length
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<SnowfallConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Get current configuration
   */
  getConfig(): SnowfallConfig {
    return { ...this.config }
  }

  /**
   * Clear all flakes
   */
  clear(): void {
    for (const flake of this.pool) {
      flake.active = false
    }
  }
}
