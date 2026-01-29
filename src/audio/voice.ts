/**
 * Synth voice with oscillator, filter, and envelope
 */

import { getAudioContext, getDryNode, getReverbNode } from './engine'

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
  filter: BiquadFilterNode
  gain: GainNode
  panner: StereoPannerNode
  startTime: number
  releaseTime: number | null
}

const voices: Voice[] = []
const MAX_VOICES = 12

/**
 * Play a note
 */
export function playNote(params: Partial<VoiceParams> = {}): void {
  const ctx = getAudioContext()
  const dryNode = getDryNode()
  const reverbNode = getReverbNode()
  
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
      }, 200)
    }
  }

  // Create voice chain: osc -> filter -> gain -> panner -> output
  const osc = ctx.createOscillator()
  osc.type = 'triangle'
  osc.frequency.value = p.frequency

  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = p.filterFreq * p.velocity
  filter.Q.value = 1

  const gain = ctx.createGain()
  gain.gain.value = 0

  const panner = ctx.createStereoPanner()
  panner.pan.value = p.pan

  // Connect chain
  osc.connect(filter)
  filter.connect(gain)
  gain.connect(panner)
  
  // Split to dry and reverb
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

  // Envelope
  const peakGain = 0.15 * p.velocity
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(peakGain, now + p.attack)
  gain.gain.setTargetAtTime(peakGain * 0.7, now + p.attack, p.release * 0.3)

  // Start oscillator
  osc.start(now)

  const voice: Voice = {
    osc,
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
    }, 300)
  }
  voices.length = 0
}
