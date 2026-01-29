/**
 * Step sequencer engine - 16 steps, 6 tracks
 * Uses Web Audio clock scheduling for tight timing
 */

import { getAudioContext, isAudioReady } from './audio/engine'
import { triggerDrum, DrumVoice } from './audio/drums'

const STEPS = 16
const TRACKS = 6

const TRACK_VOICES: DrumVoice[] = [
  'kick',
  'snare', 
  'hihatClosed',
  'hihatOpen',
  'perc',
  'accent'
]

// Pattern state: tracks x steps
const pattern: boolean[][] = Array.from({ length: TRACKS }, () =>
  Array(STEPS).fill(false) as boolean[]
)

// Playback state
let isPlaying = false
let tempo = 120  // BPM
let swing = 0    // 0-1, affects off-beat timing
let currentStep = 0
let evolveMode = false  // Auto-mutate pattern after each loop

// Stutter effect
let stutterRate = 0    // 0-1: controls subdivision (0=off, 1=32nd notes)
let stutterChance = 0  // 0-1: probability of stutter on any hit

// Scheduling
let schedulerInterval: number | null = null
let nextStepTime = 0
const LOOKAHEAD = 0.1      // How far ahead to schedule (seconds)
const SCHEDULE_AHEAD = 0.05 // How often to call scheduler (seconds)

// Callbacks for UI updates
type StepCallback = (step: number) => void
type PatternCallback = () => void
let onStepChange: StepCallback | null = null
let onPatternChange: PatternCallback | null = null

/**
 * Set callback for step changes (for playhead UI)
 */
export function setStepCallback(callback: StepCallback | null): void {
  onStepChange = callback
}

/**
 * Set callback for pattern changes (for UI sync)
 */
export function setPatternCallback(callback: PatternCallback | null): void {
  onPatternChange = callback
}

/**
 * Set evolve mode (auto-mutate after each loop)
 */
export function setEvolveMode(enabled: boolean): void {
  evolveMode = enabled
}

/**
 * Get evolve mode state
 */
export function getEvolveMode(): boolean {
  return evolveMode
}

/**
 * Set stutter parameters from X/Y pad
 * @param x - rate (0-1): 0=off, higher=faster subdivisions
 * @param y - chance (0-1): probability of stutter
 */
export function setStutter(x: number, y: number): void {
  stutterRate = Math.max(0, Math.min(1, x))
  stutterChance = Math.max(0, Math.min(1, y))
}

/**
 * Get current stutter values
 */
export function getStutter(): { rate: number; chance: number } {
  return { rate: stutterRate, chance: stutterChance }
}

/**
 * Get current pattern state
 */
export function getPattern(): boolean[][] {
  return pattern
}

/**
 * Toggle a step in the pattern
 */
export function toggleStep(track: number, step: number): boolean {
  if (track < 0 || track >= TRACKS || step < 0 || step >= STEPS) return false
  pattern[track]![step] = !pattern[track]![step]
  return pattern[track]![step]!
}

/**
 * Set a step value directly
 */
export function setStep(track: number, step: number, value: boolean): void {
  if (track < 0 || track >= TRACKS || step < 0 || step >= STEPS) return
  pattern[track]![step] = value
}

/**
 * Clear all steps
 */
export function clearPattern(): void {
  for (let t = 0; t < TRACKS; t++) {
    for (let s = 0; s < STEPS; s++) {
      pattern[t]![s] = false
    }
  }
}

/**
 * Set tempo (BPM)
 */
export function setTempo(bpm: number): void {
  tempo = Math.max(40, Math.min(200, bpm))
}

/**
 * Get current tempo
 */
export function getTempo(): number {
  return tempo
}

/**
 * Set swing amount (0-1)
 */
export function setSwing(amount: number): void {
  swing = Math.max(0, Math.min(1, amount))
}

/**
 * Get swing amount
 */
export function getSwing(): number {
  return swing
}

/**
 * Check if sequencer is playing
 */
export function isSequencerPlaying(): boolean {
  return isPlaying
}

/**
 * Get current step
 */
export function getCurrentStep(): number {
  return currentStep
}

/**
 * Start playback
 */
export function startSequencer(): void {
  if (isPlaying || !isAudioReady()) return

  const ctx = getAudioContext()
  if (!ctx) return

  isPlaying = true
  currentStep = 0
  nextStepTime = ctx.currentTime + 0.05  // Small initial delay

  // Start scheduler
  schedulerInterval = window.setInterval(scheduler, SCHEDULE_AHEAD * 1000)
}

/**
 * Stop playback
 */
export function stopSequencer(): void {
  if (!isPlaying) return

  isPlaying = false
  currentStep = 0

  if (schedulerInterval !== null) {
    clearInterval(schedulerInterval)
    schedulerInterval = null
  }

  if (onStepChange) onStepChange(-1)  // Clear playhead
}

/**
 * Toggle play/stop
 */
export function toggleSequencer(): boolean {
  if (isPlaying) {
    stopSequencer()
  } else {
    startSequencer()
  }
  return isPlaying
}

/**
 * Scheduler - runs ahead of time to schedule notes
 */
function scheduler(): void {
  const ctx = getAudioContext()
  if (!ctx || !isPlaying) return

  // Calculate step duration
  const stepDuration = 60 / tempo / 4  // 16th notes

  // Schedule all steps that fall within our lookahead window
  while (nextStepTime < ctx.currentTime + LOOKAHEAD) {
    scheduleStep(currentStep, nextStepTime)
    
    // Apply swing to off-beats (odd steps)
    const isOffBeat = currentStep % 2 === 1
    const swingOffset = isOffBeat ? stepDuration * swing * 0.3 : 0
    
    // Advance
    nextStepTime += stepDuration + swingOffset
    const prevStep = currentStep
    currentStep = (currentStep + 1) % STEPS
    
    // Check for loop completion - mutate if evolve mode is on
    if (evolveMode && prevStep === STEPS - 1 && currentStep === 0) {
      mutatePattern()
      if (onPatternChange) {
        setTimeout(() => onPatternChange!(), 0)
      }
    }
  }
}

/**
 * Schedule a single step
 */
function scheduleStep(step: number, time: number): void {
  // Notify UI (use setTimeout to sync with audio time approximately)
  const ctx = getAudioContext()
  if (ctx && onStepChange) {
    const delay = Math.max(0, (time - ctx.currentTime) * 1000)
    setTimeout(() => onStepChange!(step), delay)
  }

  const stepDuration = 60 / tempo / 4  // 16th note duration

  // Trigger drums for this step
  for (let track = 0; track < TRACKS; track++) {
    if (pattern[track]![step]) {
      // Add slight velocity variation for humanization
      const velocity = 0.8 + Math.random() * 0.2
      triggerDrum(TRACK_VOICES[track]!, time, velocity)
      
      // Check for stutter
      if (stutterRate > 0.05 && stutterChance > 0.05 && Math.random() < stutterChance) {
        scheduleStutter(track, time, stepDuration, velocity)
      }
    }
  }
}

/**
 * Schedule stutter repeats for a drum hit
 */
function scheduleStutter(track: number, startTime: number, stepDuration: number, baseVelocity: number): void {
  // Map stutterRate to subdivision: 0.25=8th, 0.5=16th, 0.75=32nd, 1=64th
  const divisions = [2, 4, 8, 16]  // relative to 16th note
  const divIndex = Math.min(Math.floor(stutterRate * 4), 3)
  const subdivision = divisions[divIndex]!
  
  const stutterInterval = stepDuration / subdivision
  
  // Number of stutters scales with rate (more stutters at higher rates)
  const maxStutters = Math.floor(2 + stutterRate * 6)  // 2-8 stutters
  const numStutters = Math.floor(Math.random() * maxStutters) + 1
  
  for (let i = 1; i <= numStutters; i++) {
    const stutterTime = startTime + (stutterInterval * i)
    // Decay velocity for each repeat
    const decayFactor = 1 - (i / (numStutters + 2)) * 0.5
    const stutterVelocity = baseVelocity * decayFactor * (0.7 + Math.random() * 0.3)
    
    triggerDrum(TRACK_VOICES[track]!, stutterTime, stutterVelocity)
  }
}

// ========================================
// Generative Fill Algorithms
// ========================================

/**
 * Euclidean rhythm - distribute N hits evenly across 16 steps
 */
function euclidean(hits: number, steps: number): boolean[] {
  const result: boolean[] = Array(steps).fill(false)
  if (hits <= 0) return result
  if (hits >= steps) return Array(steps).fill(true)

  // Bjorklund's algorithm
  let pattern: number[][] = []
  for (let i = 0; i < steps; i++) {
    pattern.push(i < hits ? [1] : [0])
  }

  let divisor = steps - hits
  steps = hits

  while (divisor > 1) {
    const half = Math.min(divisor, steps)
    for (let i = 0; i < half; i++) {
      pattern[i] = pattern[i]!.concat(pattern[pattern.length - 1]!)
      pattern.pop()
    }
    divisor = divisor - half
    steps = half
  }

  const flat = pattern.flat()
  for (let i = 0; i < result.length && i < flat.length; i++) {
    result[i] = flat[i] === 1
  }
  return result
}

/**
 * Generate a random euclidean fill
 */
export function fillEuclidean(): void {
  // Different density for each track
  const densities = [
    Math.floor(Math.random() * 4) + 2,   // kick: 2-5 hits
    Math.floor(Math.random() * 3) + 1,   // snare: 1-3 hits
    Math.floor(Math.random() * 6) + 4,   // hh closed: 4-9 hits
    Math.floor(Math.random() * 2),       // hh open: 0-1 hits
    Math.floor(Math.random() * 5) + 1,   // perc: 1-5 hits
    Math.floor(Math.random() * 3),       // accent: 0-2 hits
  ]

  for (let t = 0; t < TRACKS; t++) {
    const rhythm = euclidean(densities[t]!, STEPS)
    // Rotate by random amount for variation
    const rotation = Math.floor(Math.random() * STEPS)
    for (let s = 0; s < STEPS; s++) {
      pattern[t]![s] = rhythm[(s + rotation) % STEPS]!
    }
  }
}

/**
 * Generate random fill based on probability
 */
export function fillRandom(): void {
  const probabilities = [
    0.25,  // kick
    0.15,  // snare
    0.5,   // hh closed
    0.05,  // hh open
    0.2,   // perc
    0.1,   // accent
  ]

  for (let t = 0; t < TRACKS; t++) {
    for (let s = 0; s < STEPS; s++) {
      pattern[t]![s] = Math.random() < probabilities[t]!
    }
  }
}

/**
 * Generate IDM-style glitchy pattern
 */
export function fillGlitch(): void {
  // Start with euclidean base
  fillEuclidean()

  // Add some chaos
  for (let t = 0; t < TRACKS; t++) {
    for (let s = 0; s < STEPS; s++) {
      // 15% chance to flip any step
      if (Math.random() < 0.15) {
        pattern[t]![s] = !pattern[t]![s]
      }
    }
  }

  // Add bursts - consecutive hits on random tracks
  const burstTrack = Math.floor(Math.random() * TRACKS)
  const burstStart = Math.floor(Math.random() * 12)
  const burstLength = Math.floor(Math.random() * 3) + 2

  for (let s = burstStart; s < Math.min(burstStart + burstLength, STEPS); s++) {
    pattern[burstTrack]![s] = true
  }
}

/**
 * Subtly mutate the current pattern (for evolve mode)
 * Makes small changes rather than replacing entirely
 */
function mutatePattern(): void {
  // Pick mutation type randomly
  const mutationType = Math.random()
  
  if (mutationType < 0.3) {
    // Flip a few random steps
    const flips = Math.floor(Math.random() * 4) + 1
    for (let i = 0; i < flips; i++) {
      const t = Math.floor(Math.random() * TRACKS)
      const s = Math.floor(Math.random() * STEPS)
      pattern[t]![s] = !pattern[t]![s]
    }
  } else if (mutationType < 0.5) {
    // Shift one track left or right
    const t = Math.floor(Math.random() * TRACKS)
    const direction = Math.random() < 0.5 ? 1 : -1
    const shifted = [...pattern[t]!]
    for (let s = 0; s < STEPS; s++) {
      pattern[t]![s] = shifted[(s - direction + STEPS) % STEPS]!
    }
  } else if (mutationType < 0.7) {
    // Add or remove a hit from one track
    const t = Math.floor(Math.random() * TRACKS)
    const activeSteps = pattern[t]!.map((v, i) => v ? i : -1).filter(i => i >= 0)
    
    if (activeSteps.length > 0 && Math.random() < 0.5) {
      // Remove a random hit
      const removeIdx = activeSteps[Math.floor(Math.random() * activeSteps.length)]!
      pattern[t]![removeIdx] = false
    } else {
      // Add a hit at random empty step
      const emptySteps = pattern[t]!.map((v, i) => !v ? i : -1).filter(i => i >= 0)
      if (emptySteps.length > 0) {
        const addIdx = emptySteps[Math.floor(Math.random() * emptySteps.length)]!
        pattern[t]![addIdx] = true
      }
    }
  } else if (mutationType < 0.85) {
    // Swap two steps on a track
    const t = Math.floor(Math.random() * TRACKS)
    const s1 = Math.floor(Math.random() * STEPS)
    const s2 = Math.floor(Math.random() * STEPS)
    const temp = pattern[t]![s1]
    pattern[t]![s1] = pattern[t]![s2]!
    pattern[t]![s2] = temp!
  } else {
    // Replace one track with new euclidean rhythm
    const t = Math.floor(Math.random() * TRACKS)
    const densities = [3, 2, 6, 1, 3, 1]  // typical densities per track
    const hits = Math.max(1, densities[t]! + Math.floor(Math.random() * 3) - 1)
    const rhythm = euclidean(hits, STEPS)
    const rotation = Math.floor(Math.random() * STEPS)
    for (let s = 0; s < STEPS; s++) {
      pattern[t]![s] = rhythm[(s + rotation) % STEPS]!
    }
  }
}

/**
 * Fill types for cycling
 */
export type FillType = 'euclidean' | 'random' | 'glitch'

const fillFunctions: Record<FillType, () => void> = {
  euclidean: fillEuclidean,
  random: fillRandom,
  glitch: fillGlitch
}

let currentFillType: FillType = 'euclidean'

/**
 * Apply next fill type (cycles through)
 */
export function applyFill(): FillType {
  const types: FillType[] = ['euclidean', 'random', 'glitch']
  const currentIndex = types.indexOf(currentFillType)
  currentFillType = types[(currentIndex + 1) % types.length]!
  fillFunctions[currentFillType]()
  return currentFillType
}

/**
 * Apply specific fill type
 */
export function applyFillType(type: FillType): void {
  currentFillType = type
  fillFunctions[type]()
}
