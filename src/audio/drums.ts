/**
 * Drum synthesis engine - 6 synthesized/noise-based drum voices
 */

import { getAudioContext, getDryNode, getReverbNode, getDelayNode } from './engine'

export type DrumVoice = 'kick' | 'snare' | 'hihatClosed' | 'hihatOpen' | 'perc' | 'accent'

// Drum bus for overall level control
let drumBus: GainNode | null = null
let drumDrySend: GainNode | null = null
let drumReverbSend: GainNode | null = null
let drumDelaySend: GainNode | null = null

// Tone parameters
let toneFilter = 0.5   // 0-1: filter cutoff (0=dark, 1=bright)
let toneDecay = 0.5    // 0-1: decay time (0=short, 1=long)

/**
 * Initialize drum bus (call after audio context is ready)
 */
export function initDrums(): void {
  const ctx = getAudioContext()
  if (!ctx || drumBus) return

  drumBus = ctx.createGain()
  drumBus.gain.value = 0.5

  // Create sends to main effects
  drumDrySend = ctx.createGain()
  drumDrySend.gain.value = 0.6
  
  drumReverbSend = ctx.createGain()
  drumReverbSend.gain.value = 0.2
  
  drumDelaySend = ctx.createGain()
  drumDelaySend.gain.value = 0.1

  // Connect drum bus to sends
  const dryNode = getDryNode()
  const reverbNode = getReverbNode()
  const delayNode = getDelayNode()

  drumBus.connect(drumDrySend)
  if (dryNode) drumDrySend.connect(dryNode)

  drumBus.connect(drumReverbSend)
  if (reverbNode) drumReverbSend.connect(reverbNode)

  drumBus.connect(drumDelaySend)
  if (delayNode) drumDelaySend.connect(delayNode)
}

/**
 * Set drum bus volume
 */
export function setDrumVolume(volume: number): void {
  if (drumBus) {
    drumBus.gain.value = Math.max(0, Math.min(1, volume))
  }
}

/**
 * Set tone parameters
 * @param filter - 0-1: filter brightness
 * @param decay - 0-1: decay length
 */
export function setDrumTone(filter: number, decay: number): void {
  toneFilter = Math.max(0, Math.min(1, filter))
  toneDecay = Math.max(0, Math.min(1, decay))
}

/**
 * Get current tone values
 */
export function getDrumTone(): { filter: number; decay: number } {
  return { filter: toneFilter, decay: toneDecay }
}

// Helper to apply tone to decay times
function applyDecay(baseDecay: number): number {
  // Scale decay: 0.15x to 3x based on toneDecay (more dramatic range)
  const multiplier = 0.15 + toneDecay * 2.85
  return baseDecay * multiplier
}

// Helper to apply tone to filter frequencies
function applyFilter(baseFreq: number): number {
  // Scale frequency: 0.2x to 3x based on toneFilter (more dramatic range)
  const multiplier = 0.2 + toneFilter * 2.8
  return baseFreq * multiplier
}

/**
 * Trigger a drum voice
 */
export function triggerDrum(voice: DrumVoice, time?: number, velocity = 1): void {
  const ctx = getAudioContext()
  if (!ctx || !drumBus) return

  const t = time ?? ctx.currentTime
  const vel = Math.max(0.1, Math.min(1, velocity))

  switch (voice) {
    case 'kick':
      triggerKick(ctx, t, vel)
      break
    case 'snare':
      triggerSnare(ctx, t, vel)
      break
    case 'hihatClosed':
      triggerHihatClosed(ctx, t, vel)
      break
    case 'hihatOpen':
      triggerHihatOpen(ctx, t, vel)
      break
    case 'perc':
      triggerPerc(ctx, t, vel)
      break
    case 'accent':
      triggerAccent(ctx, t, vel)
      break
  }
}

/**
 * Kick drum - punchy IDM style with fast pitch sweep and click
 */
function triggerKick(ctx: AudioContext, time: number, velocity: number): void {
  // Randomize pitch slightly for variation
  const pitchVar = 0.9 + Math.random() * 0.2
  const decay = applyDecay(0.15)
  
  // Sine body - faster sweep for punch
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(180 * pitchVar, time)
  osc.frequency.exponentialRampToValueAtTime(35, time + 0.04)

  const oscGain = ctx.createGain()
  oscGain.gain.setValueAtTime(0.9 * velocity, time)
  oscGain.gain.exponentialRampToValueAtTime(0.001, time + decay)

  // Click transient - sharper (affected by filter)
  const clickOsc = ctx.createOscillator()
  clickOsc.type = 'square'
  clickOsc.frequency.setValueAtTime(applyFilter(1000), time)
  clickOsc.frequency.exponentialRampToValueAtTime(60, time + 0.008)
  
  const clickGain = ctx.createGain()
  clickGain.gain.setValueAtTime(0.4 * velocity * toneFilter, time)
  clickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.01)

  // Noise transient
  const noiseBuffer = createNoiseBuffer(ctx, 0.015)
  const noise = ctx.createBufferSource()
  noise.buffer = noiseBuffer

  const noiseFilter = ctx.createBiquadFilter()
  noiseFilter.type = 'bandpass'
  noiseFilter.frequency.value = applyFilter(300)
  noiseFilter.Q.value = 6

  const noiseGain = ctx.createGain()
  noiseGain.gain.setValueAtTime(0.6 * velocity, time)
  noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.012)

  // Connect
  osc.connect(oscGain)
  oscGain.connect(drumBus!)

  clickOsc.connect(clickGain)
  clickGain.connect(drumBus!)

  noise.connect(noiseFilter)
  noiseFilter.connect(noiseGain)
  noiseGain.connect(drumBus!)

  // Start and stop
  osc.start(time)
  osc.stop(time + decay + 0.1)
  clickOsc.start(time)
  clickOsc.stop(time + 0.02)
  noise.start(time)
  noise.stop(time + 0.02)
}

/**
 * Snare drum - IDM style snappy crack
 */
function triggerSnare(ctx: AudioContext, time: number, velocity: number): void {
  const pitchVar = 0.85 + Math.random() * 0.3
  const decay = applyDecay(0.06)
  
  // Noise burst - short and bright
  const noiseBuffer = createNoiseBuffer(ctx, 0.08)
  const noise = ctx.createBufferSource()
  noise.buffer = noiseBuffer

  const noiseFilter = ctx.createBiquadFilter()
  noiseFilter.type = 'highpass'
  noiseFilter.frequency.value = applyFilter(2000)
  noiseFilter.Q.value = 4

  const noiseFilter2 = ctx.createBiquadFilter()
  noiseFilter2.type = 'peaking'
  noiseFilter2.frequency.value = applyFilter(5000)
  noiseFilter2.Q.value = 8
  noiseFilter2.gain.value = 6

  const noiseGain = ctx.createGain()
  noiseGain.gain.setValueAtTime(0.45 * velocity, time)
  noiseGain.gain.exponentialRampToValueAtTime(0.001, time + decay)

  // Pitched click/thwack
  const osc = ctx.createOscillator()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(250 * pitchVar, time)
  osc.frequency.exponentialRampToValueAtTime(100, time + 0.015)

  const oscGain = ctx.createGain()
  oscGain.gain.setValueAtTime(0.5 * velocity, time)
  oscGain.gain.exponentialRampToValueAtTime(0.001, time + applyDecay(0.025))

  // Distortion for bite
  const distortion = ctx.createWaveShaper()
  distortion.curve = makeDistortionCurve(15)

  // Connect
  noise.connect(noiseFilter)
  noiseFilter.connect(noiseFilter2)
  noiseFilter2.connect(distortion)
  distortion.connect(noiseGain)
  noiseGain.connect(drumBus!)

  osc.connect(oscGain)
  oscGain.connect(drumBus!)

  // Start and stop
  noise.start(time)
  noise.stop(time + decay + 0.05)
  osc.start(time)
  osc.stop(time + 0.05)
}

/**
 * Hi-hat closed - ultra tight click
 */
function triggerHihatClosed(ctx: AudioContext, time: number, velocity: number): void {
  const decay = applyDecay(0.008)
  
  // Metallic oscillator cluster
  const freqs = [6000, 7500, 9200].map(f => applyFilter(f) * (0.95 + Math.random() * 0.1))
  
  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    osc.type = 'square'
    osc.frequency.value = freq
    
    const oscGain = ctx.createGain()
    oscGain.gain.setValueAtTime(0.08 * velocity, time)
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + decay + i * 0.002)
    
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = freq
    filter.Q.value = 20
    
    osc.connect(filter)
    filter.connect(oscGain)
    oscGain.connect(drumBus!)
    
    osc.start(time)
    osc.stop(time + 0.02)
  })

  // Short noise burst
  const noiseBuffer = createNoiseBuffer(ctx, 0.015)
  const noise = ctx.createBufferSource()
  noise.buffer = noiseBuffer

  const filter = ctx.createBiquadFilter()
  filter.type = 'highpass'
  filter.frequency.value = 9000

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.2 * velocity, time)
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.012)

  noise.connect(filter)
  filter.connect(gain)
  gain.connect(drumBus!)

  noise.start(time)
  noise.stop(time + 0.02)
}

/**
 * Hi-hat open - sizzle with controlled decay
 */
function triggerHihatOpen(ctx: AudioContext, time: number, velocity: number): void {
  // Metallic cluster
  const freqs = [5500, 7000, 8500, 10000]
  
  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    osc.type = 'square'
    osc.frequency.value = freq * (0.95 + Math.random() * 0.1)
    
    const oscGain = ctx.createGain()
    oscGain.gain.setValueAtTime(0.06 * velocity, time)
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08 + i * 0.01)
    
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = freq
    filter.Q.value = 18
    
    osc.connect(filter)
    filter.connect(oscGain)
    oscGain.connect(drumBus!)
    
    osc.start(time)
    osc.stop(time + 0.15)
  })

  // Noise tail
  const noiseBuffer = createNoiseBuffer(ctx, 0.12)
  const noise = ctx.createBufferSource()
  noise.buffer = noiseBuffer

  const filter = ctx.createBiquadFilter()
  filter.type = 'highpass'
  filter.frequency.value = 7000

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.15 * velocity, time)
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1)

  noise.connect(filter)
  filter.connect(gain)
  gain.connect(drumBus!)

  noise.start(time)
  noise.stop(time + 0.15)
}

/**
 * Perc - glitchy FM blip with random pitch
 */
function triggerPerc(ctx: AudioContext, time: number, velocity: number): void {
  // Random pitch for variety
  const basePitch = 400 + Math.random() * 1200
  const pitchDrop = basePitch * (0.1 + Math.random() * 0.3)
  
  // Carrier
  const carrier = ctx.createOscillator()
  carrier.type = Math.random() > 0.5 ? 'sine' : 'triangle'
  carrier.frequency.setValueAtTime(basePitch, time)
  carrier.frequency.exponentialRampToValueAtTime(pitchDrop, time + 0.015)

  // Modulator - high ratio for metallic quality
  const modulator = ctx.createOscillator()
  modulator.type = 'sine'
  modulator.frequency.setValueAtTime(basePitch * 2.5, time)
  modulator.frequency.exponentialRampToValueAtTime(50, time + 0.01)

  const modGain = ctx.createGain()
  modGain.gain.setValueAtTime(800, time)
  modGain.gain.exponentialRampToValueAtTime(0.1, time + 0.008)

  const outputGain = ctx.createGain()
  outputGain.gain.setValueAtTime(0.35 * velocity, time)
  outputGain.gain.exponentialRampToValueAtTime(0.001, time + 0.025)

  // FM routing
  modulator.connect(modGain)
  modGain.connect(carrier.frequency)
  carrier.connect(outputGain)
  outputGain.connect(drumBus!)

  modulator.start(time)
  modulator.stop(time + 0.03)
  carrier.start(time)
  carrier.stop(time + 0.04)
}

/**
 * Accent - aggressive zap/glitch
 */
function triggerAccent(ctx: AudioContext, time: number, velocity: number): void {
  // Random character selection
  const character = Math.random()
  
  if (character < 0.4) {
    // Zap - resonant sweep
    const osc = ctx.createOscillator()
    osc.type = 'sawtooth'
    const startFreq = 2000 + Math.random() * 4000
    osc.frequency.setValueAtTime(startFreq, time)
    osc.frequency.exponentialRampToValueAtTime(100, time + 0.02)
    
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(startFreq, time)
    filter.frequency.exponentialRampToValueAtTime(200, time + 0.015)
    filter.Q.value = 25
    
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.3 * velocity, time)
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.025)
    
    osc.connect(filter)
    filter.connect(gain)
    gain.connect(drumBus!)
    
    osc.start(time)
    osc.stop(time + 0.04)
    
  } else if (character < 0.7) {
    // Bitcrush-style noise burst
    const noiseBuffer = createNoiseBuffer(ctx, 0.03)
    const noise = ctx.createBufferSource()
    noise.buffer = noiseBuffer
    
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 1500 + Math.random() * 3000
    filter.Q.value = 20
    
    const distortion = ctx.createWaveShaper()
    distortion.curve = makeDistortionCurve(50)
    
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.4 * velocity, time)
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.02)
    
    noise.connect(filter)
    filter.connect(distortion)
    distortion.connect(gain)
    gain.connect(drumBus!)
    
    noise.start(time)
    noise.stop(time + 0.04)
    
  } else {
    // Glitch click cluster
    const clicks = 2 + Math.floor(Math.random() * 3)
    for (let i = 0; i < clicks; i++) {
      const osc = ctx.createOscillator()
      osc.type = 'square'
      osc.frequency.value = 100 + Math.random() * 800
      
      const clickGain = ctx.createGain()
      const clickTime = time + i * 0.008
      clickGain.gain.setValueAtTime(0.25 * velocity, clickTime)
      clickGain.gain.exponentialRampToValueAtTime(0.001, clickTime + 0.003)
      
      osc.connect(clickGain)
      clickGain.connect(drumBus!)
      
      osc.start(clickTime)
      osc.stop(clickTime + 0.005)
    }
  }
}

/**
 * Create a noise buffer of given duration
 */
function createNoiseBuffer(ctx: AudioContext, duration: number): AudioBuffer {
  const sampleRate = ctx.sampleRate
  const length = Math.ceil(sampleRate * duration)
  const buffer = ctx.createBuffer(1, length, sampleRate)
  const data = buffer.getChannelData(0)

  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1
  }

  return buffer
}

/**
 * Create a distortion curve for waveshaping
 */
function makeDistortionCurve(amount: number): Float32Array {
  const samples = 256
  const curve = new Float32Array(samples)
  const deg = Math.PI / 180

  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1
    curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x))
  }

  return curve
}
