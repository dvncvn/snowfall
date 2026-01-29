/**
 * Synth voice with oscillator, filter, and envelope
 */

import { getAudioContext, getDryNode, getReverbNode, getDelayNode } from './engine'

export interface VoiceParams {
  frequency: number
  velocity: number      // 0-1, affects volume and brightness
  attack: number        // seconds
  release: number       // seconds
  filterFreq: number    // Hz
  pan: number           // -1 to 1
  reverbSend: number    // 0-1
}

const defaultParams: VoiceParams = {
  frequency: 440,
  velocity: 0.5,
  attack: 0.1,
  release: 1.5,
  filterFreq: 2000,
  pan: 0,
  reverbSend: 0.5
}

interface Voice {
  osc: OscillatorNode
  osc2?: OscillatorNode  // Second oscillator for wavetable morphing
  filter: BiquadFilterNode
  gain: GainNode
  panner: StereoPannerNode
  startTime: number
  releaseTime: number | null
}

const voices: Voice[] = []
const MAX_VOICES = 12

// Global synth settings
let currentWaveform: OscillatorType = 'triangle'
let wavetablePosition = 33  // 0-100: sine(0) → triangle(33) → square(66) → saw(100)

// Waveform order for wavetable
const WAVETABLE_ORDER: OscillatorType[] = ['sine', 'triangle', 'square', 'sawtooth']
const WAVETABLE_POSITIONS = [0, 33, 66, 100]

/**
 * Set waveform type (discrete)
 */
export function setWaveform(type: OscillatorType): void {
  currentWaveform = type
  // Sync wavetable position
  const idx = WAVETABLE_ORDER.indexOf(type)
  if (idx >= 0) wavetablePosition = WAVETABLE_POSITIONS[idx] ?? 33
}

/**
 * Get current waveform
 */
export function getWaveform(): OscillatorType {
  return currentWaveform
}

/**
 * Set wavetable position (0-100)
 * Morphs between: sine(0) → triangle(33) → square(66) → sawtooth(100)
 */
export function setWavetablePosition(pos: number): void {
  wavetablePosition = Math.max(0, Math.min(100, pos))
  // Update discrete waveform to nearest
  if (pos <= 16) currentWaveform = 'sine'
  else if (pos <= 50) currentWaveform = 'triangle'
  else if (pos <= 83) currentWaveform = 'square'
  else currentWaveform = 'sawtooth'
}

/**
 * Get wavetable position
 */
export function getWavetablePosition(): number {
  return wavetablePosition
}

/**
 * Get waveforms and blend for current position
 * Returns [waveA, waveB, blendAmount] where blend 0 = all A, 1 = all B
 */
function getWavetableBlend(): [OscillatorType, OscillatorType, number] {
  const pos = wavetablePosition
  
  // Check for exact positions first (no blending needed)
  for (let i = 0; i < WAVETABLE_POSITIONS.length; i++) {
    if (pos === WAVETABLE_POSITIONS[i]) {
      const wave = WAVETABLE_ORDER[i]!
      return [wave, wave, 0]
    }
  }
  
  // Find which segment we're in for blending
  for (let i = 0; i < WAVETABLE_POSITIONS.length - 1; i++) {
    const startPos = WAVETABLE_POSITIONS[i]!
    const endPos = WAVETABLE_POSITIONS[i + 1]!
    
    if (pos > startPos && pos < endPos) {
      const blend = (pos - startPos) / (endPos - startPos)
      return [WAVETABLE_ORDER[i]!, WAVETABLE_ORDER[i + 1]!, blend]
    }
  }
  
  // At or past end
  return ['sawtooth', 'sawtooth', 0]
}

/**
 * Play a note
 */
export function playNote(params: Partial<VoiceParams> = {}): void {
  const ctx = getAudioContext()
  const dryNode = getDryNode()
  const reverbNode = getReverbNode()
  const delayNode = getDelayNode()
  
  if (!ctx || !dryNode || !reverbNode) return

  const p = { ...defaultParams, ...params }
  const now = ctx.currentTime

  // Voice stealing if at max
  if (voices.length >= MAX_VOICES) {
    const oldest = voices.shift()
    if (oldest) {
      oldest.gain.gain.cancelScheduledValues(now)
      oldest.gain.gain.setTargetAtTime(0, now, 0.05)
      setTimeout(() => {
        oldest.osc.stop()
        oldest.osc.disconnect()
        if (oldest.osc2) {
          oldest.osc2.stop()
          oldest.osc2.disconnect()
        }
      }, 200)
    }
  }

  // Get wavetable blend
  const [waveA, waveB, blend] = getWavetableBlend()
  const useBlend = blend > 0.01 && blend < 0.99

  // Create voice chain: osc(s) -> filter -> gain -> panner -> output
  const osc = ctx.createOscillator()
  osc.type = waveA
  osc.frequency.value = p.frequency

  // Second oscillator for morphing
  let osc2: OscillatorNode | undefined
  let oscMixA: GainNode | undefined
  let oscMixB: GainNode | undefined
  
  if (useBlend) {
    osc2 = ctx.createOscillator()
    osc2.type = waveB
    osc2.frequency.value = p.frequency
    
    // Crossfade gains (equal power crossfade)
    oscMixA = ctx.createGain()
    oscMixB = ctx.createGain()
    oscMixA.gain.value = Math.cos(blend * Math.PI / 2)
    oscMixB.gain.value = Math.sin(blend * Math.PI / 2)
  }

  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = p.filterFreq * p.velocity
  filter.Q.value = 1

  const gain = ctx.createGain()
  gain.gain.value = 0

  const panner = ctx.createStereoPanner()
  panner.pan.value = p.pan

  // Connect chain
  if (useBlend && osc2 && oscMixA && oscMixB) {
    osc.connect(oscMixA)
    osc2.connect(oscMixB)
    oscMixA.connect(filter)
    oscMixB.connect(filter)
  } else {
    osc.connect(filter)
  }
  filter.connect(gain)
  gain.connect(panner)
  
  // Split to dry, reverb, and delay
  const dryAmount = 1 - p.reverbSend * 0.5
  const wetAmount = p.reverbSend
  
  const drySend = ctx.createGain()
  drySend.gain.value = dryAmount
  panner.connect(drySend)
  drySend.connect(dryNode)
  
  const wetSend = ctx.createGain()
  wetSend.gain.value = wetAmount
  panner.connect(wetSend)
  wetSend.connect(reverbNode)

  // Send to delay (uses same send amount as reverb)
  if (delayNode) {
    const delaySend = ctx.createGain()
    delaySend.gain.value = wetAmount * 0.7
    panner.connect(delaySend)
    delaySend.connect(delayNode)
  }

  // Envelope
  const peakGain = 0.15 * p.velocity
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(peakGain, now + p.attack)
  gain.gain.setTargetAtTime(peakGain * 0.7, now + p.attack, p.release * 0.3)

  // Start oscillator(s)
  osc.start(now)
  if (osc2) osc2.start(now)

  const voice: Voice = {
    osc,
    osc2,
    filter,
    gain,
    panner,
    startTime: now,
    releaseTime: null
  }

  voices.push(voice)

  // Schedule release
  const totalDuration = p.attack + p.release * 2
  setTimeout(() => {
    releaseVoice(voice, p.release)
  }, totalDuration * 1000)
}

/**
 * Release a voice
 */
function releaseVoice(voice: Voice, releaseTime: number): void {
  const ctx = getAudioContext()
  if (!ctx) return

  const now = ctx.currentTime
  voice.releaseTime = now

  voice.gain.gain.cancelScheduledValues(now)
  voice.gain.gain.setTargetAtTime(0, now, releaseTime * 0.3)

  // Stop and cleanup after release
  setTimeout(() => {
    voice.osc.stop()
    voice.osc.disconnect()
    if (voice.osc2) {
      voice.osc2.stop()
      voice.osc2.disconnect()
    }
    const idx = voices.indexOf(voice)
    if (idx >= 0) voices.splice(idx, 1)
  }, releaseTime * 1500)
}

/**
 * Get current voice count
 */
export function getVoiceCount(): number {
  return voices.length
}

/**
 * Stop all voices
 */
export function stopAllVoices(): void {
  const ctx = getAudioContext()
  if (!ctx) return

  const now = ctx.currentTime
  for (const voice of voices) {
    voice.gain.gain.cancelScheduledValues(now)
    voice.gain.gain.setTargetAtTime(0, now, 0.1)
    setTimeout(() => {
      voice.osc.stop()
      voice.osc.disconnect()
      if (voice.osc2) {
        voice.osc2.stop()
        voice.osc2.disconnect()
      }
    }, 300)
  }
  voices.length = 0
}
