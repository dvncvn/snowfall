/**
 * Evolution system - gradual changes over time
 * Creates slow parameter drift, mood shifts, and quiet moments
 */

import { setMusicConfig, getMusicConfig, getScaleNames, type ScaleName } from './audio/music'
import { setWindConfig, getWindConfig } from './wind'
import { lerp, randomRange } from './utils'

export interface EvolutionConfig {
  enabled: boolean
  moodShiftInterval: number      // seconds between potential scale changes
  densityShiftInterval: number   // seconds between density adjustments
  quietMomentChance: number      // 0-1, chance of quiet moment per interval
  quietMomentDuration: number    // seconds
}

const defaultConfig: EvolutionConfig = {
  enabled: true,
  moodShiftInterval: 180,        // 3 minutes
  densityShiftInterval: 60,      // 1 minute
  quietMomentChance: 0.03,       // very rare quiet moments
  quietMomentDuration: 3         // very short quiet moments
}

let config = { ...defaultConfig }
let elapsedTime = 0
let lastMoodShift = 0
let lastDensityShift = 0
let inQuietMoment = false
let quietMomentEnd = 0

// Target values for smooth transitions
let targetNoteProbability = 0.6
let targetWindStrength = 0.3
let currentNoteProbability = 0.6
let currentWindStrength = 0.3
let windUserOverride = false

// Density callback (set by main.ts)
let onDensityChange: ((density: number) => void) | null = null

/**
 * Update evolution system
 */
export function updateEvolution(delta: number): void {
  if (!config.enabled) return

  elapsedTime += delta

  // Smooth parameter transitions
  currentNoteProbability = lerp(currentNoteProbability, targetNoteProbability, delta * 0.5)
  setMusicConfig({ noteProbability: currentNoteProbability })

  // Only control wind if user hasn't overridden
  if (!windUserOverride) {
    currentWindStrength = lerp(currentWindStrength, targetWindStrength, delta * 0.3)
    setWindConfig({ strength: currentWindStrength })
  }

  // Handle quiet moment ending
  if (inQuietMoment && elapsedTime >= quietMomentEnd) {
    endQuietMoment()
  }

  // Check for mood shift
  if (elapsedTime - lastMoodShift >= config.moodShiftInterval) {
    lastMoodShift = elapsedTime
    maybeShiftMood()
  }

  // Check for density shift
  if (elapsedTime - lastDensityShift >= config.densityShiftInterval) {
    lastDensityShift = elapsedTime
    shiftDensity()
  }
}

/**
 * Possibly change the musical scale
 */
function maybeShiftMood(): void {
  // 50% chance to actually shift
  if (Math.random() > 0.5) return

  const scales = getScaleNames()
  const currentScale = getMusicConfig().scale
  
  // Pick a different scale
  let newScale: ScaleName
  do {
    newScale = scales[Math.floor(Math.random() * scales.length)]!
  } while (newScale === currentScale && scales.length > 1)

  setMusicConfig({ scale: newScale })

  // Occasionally trigger a quiet moment with mood shift
  if (Math.random() < config.quietMomentChance) {
    startQuietMoment()
  }
}

/**
 * Adjust density and wind
 */
function shiftDensity(): void {
  // Random walk for note probability
  const musicConfig = getMusicConfig()
  const probDelta = randomRange(-0.05, 0.08)  // bias upward
  targetNoteProbability = Math.max(0.4, Math.min(0.7, musicConfig.noteProbability + probDelta))

  // Random walk for wind
  const windConfig = getWindConfig()
  const windDelta = randomRange(-0.15, 0.15)
  targetWindStrength = Math.max(0.1, Math.min(0.6, windConfig.strength + windDelta))

  // Notify density change for particle system
  if (onDensityChange) {
    const baseDensity = 12
    const densityVariation = randomRange(-8, 8)
    onDensityChange(Math.max(10, baseDensity + densityVariation))
  }
}

/**
 * Start a quiet moment
 */
function startQuietMoment(): void {
  inQuietMoment = true
  quietMomentEnd = elapsedTime + config.quietMomentDuration

  // Slightly reduce activity (but stay audible)
  targetNoteProbability = 0.35
  
  // Calm the wind
  targetWindStrength = 0.15
}

/**
 * End a quiet moment
 */
function endQuietMoment(): void {
  inQuietMoment = false
  
  // Restore to active values
  targetNoteProbability = randomRange(0.5, 0.65)
  targetWindStrength = randomRange(0.25, 0.4)
}

/**
 * Set density change callback
 */
export function setDensityCallback(callback: (density: number) => void): void {
  onDensityChange = callback
}

/**
 * Update evolution configuration
 */
export function setEvolutionConfig(newConfig: Partial<EvolutionConfig>): void {
  config = { ...config, ...newConfig }
}

/**
 * Get current evolution configuration
 */
export function getEvolutionConfig(): EvolutionConfig {
  return { ...config }
}

/**
 * Reset evolution state
 */
export function resetEvolution(): void {
  elapsedTime = 0
  lastMoodShift = 0
  lastDensityShift = 0
  inQuietMoment = false
  targetNoteProbability = 0.6
  targetWindStrength = 0.3
  currentNoteProbability = 0.6
  currentWindStrength = 0.3
  windUserOverride = false
}

/**
 * Set wind user override (stops evolution from controlling wind)
 */
export function setWindUserOverride(override: boolean): void {
  windUserOverride = override
}

/**
 * Check if in quiet moment
 */
export function isQuietMoment(): boolean {
  return inQuietMoment
}
