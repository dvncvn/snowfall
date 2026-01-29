/**
 * Musical logic - scales, note selection, rhythm
 */

import { playNote } from './voice'
import { randomRange } from '../utils'

// Scale definitions (intervals from root)
const SCALES = {
  pentatonic: [0, 2, 4, 7, 9],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  major: [0, 2, 4, 5, 7, 9, 11]
} as const

export type ScaleName = keyof typeof SCALES

export interface MusicConfig {
  scale: ScaleName
  rootNote: number        // MIDI note number (60 = middle C)
  minOctave: number       // octave offset from root
  maxOctave: number
  noteProbability: number // 0-1, chance of note per trigger
  baseAttack: number
  baseRelease: number
  reverbAmount: number
}

const defaultConfig: MusicConfig = {
  scale: 'pentatonic',
  rootNote: 60,
  minOctave: -1,
  maxOctave: 2,
  noteProbability: 0.6,  // increased for more activity
  baseAttack: 0.08,
  baseRelease: 2,
  reverbAmount: 0.6
}

let config = { ...defaultConfig }

// Rate limiting for performance
const NOTE_RATE_LIMIT = 60 // min ms between notes (faster)
let lastNoteTime = 0

/**
 * Convert MIDI note to frequency
 */
function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

/**
 * Get a random note from the current scale
 */
export function getRandomNote(): number {
  const scale = SCALES[config.scale]
  const octave = Math.floor(randomRange(config.minOctave, config.maxOctave + 1))
  const scaleIndex = Math.floor(Math.random() * scale.length)
  const interval = scale[scaleIndex]!
  
  return config.rootNote + octave * 12 + interval
}

/**
 * Trigger a musical event from a snowflake
 * @param x - x position (0-1, normalized)
 * @param y - y position (0-1, normalized)
 * @param size - flake size (0-1, normalized)
 */
export function triggerNote(x: number, y: number, size: number): void {
  // Rate limit for performance
  const now = performance.now()
  if (now - lastNoteTime < NOTE_RATE_LIMIT) return
  lastNoteTime = now

  // Probability gate
  if (Math.random() > config.noteProbability) return

  // Map position to musical parameters
  const pan = (x - 0.5) * 1.6  // slight stereo spread
  
  // Higher = higher pitch tendency
  const pitchBias = 1 - y
  
  // Get note with pitch bias
  const scale = SCALES[config.scale]
  const octaveRange = config.maxOctave - config.minOctave
  const biasedOctave = config.minOctave + Math.floor(pitchBias * octaveRange * 0.7 + Math.random() * octaveRange * 0.3)
  const scaleIndex = Math.floor(Math.random() * scale.length)
  const interval = scale[scaleIndex]!
  const midiNote = config.rootNote + biasedOctave * 12 + interval
  
  // Size affects velocity and filter
  const velocity = 0.3 + size * 0.5
  const filterFreq = 800 + size * 2000 + pitchBias * 1500

  // Slight timing humanization
  const attackVariation = config.baseAttack * (0.8 + Math.random() * 0.4)
  const releaseVariation = config.baseRelease * (0.7 + Math.random() * 0.6)

  playNote({
    frequency: midiToFreq(midiNote),
    velocity,
    attack: attackVariation,
    release: releaseVariation,
    filterFreq,
    pan,
    reverbSend: config.reverbAmount
  })
}

/**
 * Update music configuration
 */
export function setMusicConfig(newConfig: Partial<MusicConfig>): void {
  config = { ...config, ...newConfig }
}

/**
 * Get current music configuration
 */
export function getMusicConfig(): MusicConfig {
  return { ...config }
}

/**
 * Get available scale names
 */
export function getScaleNames(): ScaleName[] {
  return Object.keys(SCALES) as ScaleName[]
}

/**
 * Set a random scale (for mood shifts)
 */
export function randomizeScale(): void {
  const scales = getScaleNames()
  const newScale = scales[Math.floor(Math.random() * scales.length)]!
  config.scale = newScale
}

/**
 * Trigger twinkly sounds from a click event
 * Creates a rapid cluster of high, bright notes
 */
export function triggerTwinkle(x: number, _y: number): void {
  const scale = SCALES[config.scale]
  const pan = (x - 0.5) * 1.6
  
  // Play 3-5 rapid notes
  const noteCount = 3 + Math.floor(Math.random() * 3)
  
  for (let i = 0; i < noteCount; i++) {
    // High octaves (2-4 above root)
    const octave = 2 + Math.floor(Math.random() * 3)
    const scaleIndex = Math.floor(Math.random() * scale.length)
    const interval = scale[scaleIndex]!
    const midiNote = config.rootNote + octave * 12 + interval
    
    // Stagger the notes slightly
    const delay = i * (30 + Math.random() * 40)
    
    setTimeout(() => {
      playNote({
        frequency: midiToFreq(midiNote),
        velocity: 0.4 + Math.random() * 0.3,
        attack: 0.005 + Math.random() * 0.01,  // very fast attack
        release: 0.8 + Math.random() * 1.2,     // short-medium release
        filterFreq: 3000 + Math.random() * 4000, // bright
        pan: pan + (Math.random() - 0.5) * 0.4,  // slight spread
        reverbSend: config.reverbAmount * 1.2    // extra reverb for shimmer
      })
    }, delay)
  }
}
