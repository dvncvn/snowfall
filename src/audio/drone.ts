/**
 * Low drone layer - occasional complementary bass notes
 */

import { getAudioContext, getDryNode, getReverbNode } from './engine'
import { getMusicConfig } from './music'
import { getWavetablePosition } from './voice'

interface DroneVoice {
  osc: OscillatorNode
  osc2?: OscillatorNode
  gain: GainNode
  filter: BiquadFilterNode
}

let droneVoice: DroneVoice | null = null
let droneInterval: number | null = null
let droneEnabled = true

// Drone config
const DRONE_INTERVAL_MIN = 3000   // 3 seconds minimum between drones
const DRONE_INTERVAL_MAX = 8000   // 8 seconds maximum
const DRONE_DURATION = 6000       // 6 second sustain
const DRONE_ATTACK = 2.0          // 2 second fade in
const DRONE_RELEASE = 3.0         // 3 second fade out

// Root notes for drones (octave below main range)
const DRONE_NOTES: Record<string, number[]> = {
  pentatonic: [36, 43, 48],     // C2, G2, C3
  dorian: [36, 38, 43],         // C2, D2, G2
  lydian: [36, 42, 43],         // C2, F#2, G2
  mixolydian: [36, 43, 46],     // C2, G2, Bb2
  aeolian: [36, 43, 48],        // C2, G2, C3
  major: [36, 40, 43],          // C2, E2, G2
}

/**
 * MIDI to frequency
 */
function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

/**
 * Get waveforms for current wavetable position
 */
function getWaveforms(): [OscillatorType, OscillatorType, number] {
  const pos = getWavetablePosition()
  const order: OscillatorType[] = ['sine', 'triangle', 'square', 'sawtooth']
  const positions = [0, 33, 66, 100]
  
  // Check for exact positions first
  for (let i = 0; i < positions.length; i++) {
    if (pos === positions[i]) {
      const wave = order[i]!
      return [wave, wave, 0]
    }
  }
  
  // Find segment for blending
  for (let i = 0; i < positions.length - 1; i++) {
    const start = positions[i]!
    const end = positions[i + 1]!
    if (pos > start && pos < end) {
      const blend = (pos - start) / (end - start)
      return [order[i]!, order[i + 1]!, blend]
    }
  }
  return ['sawtooth', 'sawtooth', 0]
}

/**
 * Play a drone note
 */
function playDrone(): void {
  if (!droneEnabled) return
  
  const ctx = getAudioContext()
  const dryNode = getDryNode()
  const reverbNode = getReverbNode()
  
  if (!ctx || !dryNode || !reverbNode) return

  // Stop existing drone if playing
  stopDrone()

  const config = getMusicConfig()
  const notes = DRONE_NOTES[config.scale] || DRONE_NOTES['pentatonic']!
  const note = notes[Math.floor(Math.random() * notes.length)]!
  const freq = midiToFreq(note)
  
  const now = ctx.currentTime
  const [waveA, waveB, blend] = getWaveforms()
  const useBlend = blend > 0.01 && blend < 0.99

  // Create oscillator(s)
  const osc = ctx.createOscillator()
  osc.type = waveA
  osc.frequency.value = freq

  let osc2: OscillatorNode | undefined
  let mixA: GainNode | undefined
  let mixB: GainNode | undefined

  if (useBlend) {
    osc2 = ctx.createOscillator()
    osc2.type = waveB
    osc2.frequency.value = freq
    
    mixA = ctx.createGain()
    mixB = ctx.createGain()
    mixA.gain.value = Math.cos(blend * Math.PI / 2)
    mixB.gain.value = Math.sin(blend * Math.PI / 2)
  }

  // Low pass filter for warmth
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 400
  filter.Q.value = 0.5

  // Gain for envelope
  const gain = ctx.createGain()
  gain.gain.value = 0

  // Connect chain
  if (useBlend && osc2 && mixA && mixB) {
    osc.connect(mixA)
    osc2.connect(mixB)
    mixA.connect(filter)
    mixB.connect(filter)
  } else {
    osc.connect(filter)
  }
  
  filter.connect(gain)

  // Send to dry and reverb (heavier reverb for drones)
  const drySend = ctx.createGain()
  drySend.gain.value = 0.3
  gain.connect(drySend)
  drySend.connect(dryNode)

  const wetSend = ctx.createGain()
  wetSend.gain.value = 0.7
  gain.connect(wetSend)
  wetSend.connect(reverbNode)

  // Envelope: slow attack, sustain, slow release
  const peakGain = 0.08
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(peakGain, now + DRONE_ATTACK)
  gain.gain.setValueAtTime(peakGain, now + DRONE_ATTACK + DRONE_DURATION / 1000)
  gain.gain.linearRampToValueAtTime(0, now + DRONE_ATTACK + DRONE_DURATION / 1000 + DRONE_RELEASE)

  // Start
  osc.start(now)
  if (osc2) osc2.start(now)

  droneVoice = { osc, osc2, gain, filter }

  // Schedule stop
  const totalDuration = (DRONE_ATTACK + DRONE_DURATION / 1000 + DRONE_RELEASE + 0.5) * 1000
  setTimeout(() => {
    stopDrone()
  }, totalDuration)
}

/**
 * Stop current drone
 */
function stopDrone(): void {
  if (!droneVoice) return
  
  const ctx = getAudioContext()
  if (!ctx) return

  const now = ctx.currentTime
  droneVoice.gain.gain.cancelScheduledValues(now)
  droneVoice.gain.gain.setTargetAtTime(0, now, 0.3)

  const voice = droneVoice
  droneVoice = null

  setTimeout(() => {
    try {
      voice.osc.stop()
      voice.osc.disconnect()
      if (voice.osc2) {
        voice.osc2.stop()
        voice.osc2.disconnect()
      }
    } catch {
      // Already stopped
    }
  }, 500)
}

/**
 * Schedule next drone
 */
function scheduleNextDrone(): void {
  if (droneInterval) clearTimeout(droneInterval)
  
  const delay = DRONE_INTERVAL_MIN + Math.random() * (DRONE_INTERVAL_MAX - DRONE_INTERVAL_MIN)
  droneInterval = window.setTimeout(() => {
    playDrone()
    scheduleNextDrone()
  }, delay)
}

/**
 * Start drone system
 */
export function startDrones(): void {
  if (!droneEnabled) return
  scheduleNextDrone()
}

/**
 * Stop drone system
 */
export function stopDrones(): void {
  if (droneInterval) {
    clearTimeout(droneInterval)
    droneInterval = null
  }
  stopDrone()
}

/**
 * Enable/disable drones
 */
export function setDroneEnabled(enabled: boolean): void {
  droneEnabled = enabled
  if (!enabled) {
    stopDrones()
  }
}

/**
 * Check if drones enabled
 */
export function isDroneEnabled(): boolean {
  return droneEnabled
}
