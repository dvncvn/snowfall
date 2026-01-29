/**
 * Audio engine - manages AudioContext, master chain, and effects
 */

let audioContext: AudioContext | null = null
let masterGain: GainNode | null = null
let reverbGain: GainNode | null = null
let reverbNode: ConvolverNode | null = null
let dryGain: GainNode | null = null

// Delay effect
let delayNode: DelayNode | null = null
let delayFeedback: GainNode | null = null
let delayGain: GainNode | null = null
let delayFilter: BiquadFilterNode | null = null

// Tape warble effect
let warbleDelay: DelayNode | null = null
let warbleLFO: OscillatorNode | null = null
let warbleDepth: GainNode | null = null
let warbleMix: GainNode | null = null
let warbleDry: GainNode | null = null
let warbleRandomEnabled = false
let warbleRandomInterval: number | null = null

// Noise/crackle effect
let noiseNode: AudioBufferSourceNode | null = null
let noiseGain: GainNode | null = null
let noiseFilter: BiquadFilterNode | null = null
let crackleGain: GainNode | null = null
let crackleInterval: number | null = null

/**
 * Initialize audio engine (call on user gesture)
 */
export async function initAudio(): Promise<void> {
  if (audioContext) return

  audioContext = new AudioContext()
  
  // Master gain
  masterGain = audioContext.createGain()
  masterGain.gain.value = 0.7
  masterGain.connect(audioContext.destination)

  // Dry path (will be routed through warble later)
  dryGain = audioContext.createGain()
  dryGain.gain.value = 0.6

  // Reverb path
  reverbGain = audioContext.createGain()
  reverbGain.gain.value = 0.6  // Increased for more audible reverb
  
  // Create impulse response for reverb (longer, slower decay)
  reverbNode = audioContext.createConvolver()
  reverbNode.buffer = createReverbImpulse(audioContext, 3.5, 1.5)
  
  reverbGain.connect(reverbNode)
  reverbNode.connect(masterGain)

  // Delay effect (ping-pong style with filter)
  delayNode = audioContext.createDelay(2.0)
  delayNode.delayTime.value = 0.3

  delayFeedback = audioContext.createGain()
  delayFeedback.gain.value = 0.4

  delayGain = audioContext.createGain()
  delayGain.gain.value = 0.3

  // Filter in feedback loop for darker repeats
  delayFilter = audioContext.createBiquadFilter()
  delayFilter.type = 'lowpass'
  delayFilter.frequency.value = 2000

  // Delay routing: input -> delay -> filter -> feedback -> delay
  //                              \-> delayGain -> master
  delayNode.connect(delayFilter)
  delayFilter.connect(delayFeedback)
  delayFeedback.connect(delayNode)
  delayNode.connect(delayGain)
  delayGain.connect(masterGain)

  // Tape warble effect (pitch wobble via modulated delay)
  // Uses a short delay line with LFO-modulated delay time
  warbleDelay = audioContext.createDelay(0.1)
  warbleDelay.delayTime.value = 0.005  // 5ms base delay
  
  // LFO for warble
  warbleLFO = audioContext.createOscillator()
  warbleLFO.type = 'sine'
  warbleLFO.frequency.value = 0.5  // Slow wobble rate (Hz)
  
  // Depth control - scales LFO output
  warbleDepth = audioContext.createGain()
  warbleDepth.gain.value = 0.002  // Small depth for subtle pitch variation
  
  // Connect LFO to delay time
  warbleLFO.connect(warbleDepth)
  warbleDepth.connect(warbleDelay.delayTime)
  warbleLFO.start()
  
  // Mix controls
  warbleMix = audioContext.createGain()
  warbleMix.gain.value = 0.5  // Default 50% wet
  
  warbleDry = audioContext.createGain()
  warbleDry.gain.value = 0.5  // Default 50% dry
  
  // Route dry signal through warble effect
  // dryGain -> warbleDelay -> warbleMix -> masterGain
  //        \-> warbleDry -> masterGain
  dryGain.connect(warbleDelay)
  warbleDelay.connect(warbleMix)
  warbleMix.connect(masterGain)
  
  dryGain.connect(warbleDry)
  warbleDry.connect(masterGain)

  // Noise/crackle effect
  noiseGain = audioContext.createGain()
  noiseGain.gain.value = 0.0025  // Very subtle by default
  
  // Filter to shape noise (vinyl-like hiss)
  noiseFilter = audioContext.createBiquadFilter()
  noiseFilter.type = 'highpass'
  noiseFilter.frequency.value = 1000
  noiseFilter.Q.value = 0.5
  
  noiseFilter.connect(noiseGain)
  noiseGain.connect(masterGain)
  
  // Create and start noise
  startNoiseGenerator(audioContext)
  
  // Crackle (random pops)
  crackleGain = audioContext.createGain()
  crackleGain.gain.value = 0.03
  crackleGain.connect(masterGain)
  
  // Start crackle generator
  startCrackleGenerator()
}

/**
 * Create a more realistic reverb impulse response
 * Uses multiple decay stages and filtered noise for richer sound
 */
function createReverbImpulse(ctx: AudioContext, duration: number, decay: number): AudioBuffer {
  const sampleRate = ctx.sampleRate
  const length = Math.floor(sampleRate * duration)
  const buffer = ctx.createBuffer(2, length, sampleRate)
  
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel)
    
    // Pre-delay (small silence at start)
    const preDelay = Math.floor(sampleRate * 0.02)
    
    for (let i = 0; i < length; i++) {
      if (i < preDelay) {
        data[i] = 0
        continue
      }
      
      const t = (i - preDelay) / (length - preDelay)
      
      // Multi-stage decay for more natural reverb tail
      const earlyDecay = Math.exp(-t * 6) * 0.5  // Fast initial decay
      const lateDecay = Math.exp(-t * decay) * 0.8  // Slower tail
      const envelope = earlyDecay + lateDecay
      
      // Filtered noise (less harsh high frequencies)
      let noise = Math.random() * 2 - 1
      
      // Simple lowpass effect by averaging with previous sample
      if (i > preDelay) {
        noise = noise * 0.6 + (data[i - 1] || 0) * 0.4
      }
      
      // Add some early reflections
      const earlyReflection = (i < sampleRate * 0.1) 
        ? Math.sin(i * 0.01) * Math.exp(-t * 20) * 0.3 
        : 0
      
      data[i] = (noise * envelope + earlyReflection) * 0.8
    }
  }
  
  return buffer
}

/**
 * Get the audio context
 */
export function getAudioContext(): AudioContext | null {
  return audioContext
}

/**
 * Get the dry output node (for direct sound)
 */
export function getDryNode(): GainNode | null {
  return dryGain
}

/**
 * Get the reverb send node
 */
export function getReverbNode(): GainNode | null {
  return reverbGain
}

/**
 * Set master volume (0-1)
 */
export function setMasterVolume(volume: number): void {
  if (masterGain) {
    masterGain.gain.setTargetAtTime(volume, audioContext!.currentTime, 0.1)
  }
}

/**
 * Set reverb mix (0-1)
 */
export function setReverbMix(mix: number): void {
  if (reverbGain && dryGain && audioContext) {
    // More dramatic reverb range
    reverbGain.gain.setTargetAtTime(mix * 0.9, audioContext.currentTime, 0.1)
    dryGain.gain.setTargetAtTime(0.7 - mix * 0.3, audioContext.currentTime, 0.1)
  }
}

/**
 * Get the delay send node
 */
export function getDelayNode(): DelayNode | null {
  return delayNode
}

/**
 * Set delay time (0-2 seconds)
 */
export function setDelayTime(time: number): void {
  if (delayNode && audioContext) {
    // Use setValueAtTime for instant change (avoids pitch artifacts from gradual transition)
    delayNode.delayTime.setValueAtTime(time, audioContext.currentTime)
  }
}

/**
 * Set delay feedback (0-1)
 */
export function setDelayFeedback(feedback: number): void {
  if (delayFeedback && audioContext) {
    // Cap at 0.85 to prevent runaway feedback
    const safeFeedback = Math.min(feedback, 0.85)
    delayFeedback.gain.setTargetAtTime(safeFeedback, audioContext.currentTime, 0.1)
  }
}

/**
 * Set delay mix (0-1)
 */
export function setDelayMix(mix: number): void {
  if (delayGain && audioContext) {
    delayGain.gain.setTargetAtTime(mix * 0.5, audioContext.currentTime, 0.1)
  }
}

/**
 * Check if audio is initialized
 */
export function isAudioReady(): boolean {
  return audioContext !== null && audioContext.state === 'running'
}

/**
 * Resume audio context if suspended
 */
export async function resumeAudio(): Promise<void> {
  if (audioContext && audioContext.state === 'suspended') {
    await audioContext.resume()
  }
}

/**
 * Set warble rate (0-1 maps to 0.1-4 Hz)
 */
export function setWarbleRate(rate: number): void {
  if (warbleLFO && audioContext) {
    const freq = 0.1 + rate * 3.9  // 0.1 to 4 Hz
    warbleLFO.frequency.setTargetAtTime(freq, audioContext.currentTime, 0.1)
  }
}

/**
 * Set warble depth (0-1)
 */
export function setWarbleDepth(depth: number): void {
  if (warbleDepth && audioContext) {
    // Map to 0-0.008 for subtle to noticeable pitch wobble
    const depthValue = depth * 0.008
    warbleDepth.gain.setTargetAtTime(depthValue, audioContext.currentTime, 0.1)
  }
}

/**
 * Set warble mix (0-1)
 */
export function setWarbleMix(mix: number): void {
  if (warbleMix && warbleDry && audioContext) {
    warbleMix.gain.setTargetAtTime(mix, audioContext.currentTime, 0.1)
    warbleDry.gain.setTargetAtTime(1 - mix, audioContext.currentTime, 0.1)
  }
}

/**
 * Enable/disable random warble modulation
 */
export function setWarbleRandom(enabled: boolean): void {
  warbleRandomEnabled = enabled
  
  if (enabled) {
    // Start random modulation
    const randomize = () => {
      if (!warbleRandomEnabled || !warbleLFO || !warbleDepth || !audioContext) return
      
      // Random rate: 0.2 - 3 Hz
      const rate = 0.2 + Math.random() * 2.8
      warbleLFO.frequency.setTargetAtTime(rate, audioContext.currentTime, 0.5)
      
      // Random depth: 0.001 - 0.006
      const depth = 0.001 + Math.random() * 0.005
      warbleDepth.gain.setTargetAtTime(depth, audioContext.currentTime, 0.5)
      
      // Schedule next randomization (2-6 seconds)
      const nextTime = 2000 + Math.random() * 4000
      warbleRandomInterval = window.setTimeout(randomize, nextTime)
    }
    
    randomize()
  } else {
    // Stop random modulation
    if (warbleRandomInterval !== null) {
      clearTimeout(warbleRandomInterval)
      warbleRandomInterval = null
    }
  }
}

/**
 * Create white noise buffer
 */
function createNoiseBuffer(ctx: AudioContext, duration: number): AudioBuffer {
  const sampleRate = ctx.sampleRate
  const length = Math.floor(sampleRate * duration)
  const buffer = ctx.createBuffer(1, length, sampleRate)
  const data = buffer.getChannelData(0)
  
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1
  }
  
  return buffer
}

/**
 * Start the noise generator
 */
function startNoiseGenerator(ctx: AudioContext): void {
  if (noiseNode) {
    noiseNode.stop()
    noiseNode.disconnect()
  }
  
  noiseNode = ctx.createBufferSource()
  noiseNode.buffer = createNoiseBuffer(ctx, 2)
  noiseNode.loop = true
  noiseNode.connect(noiseFilter!)
  noiseNode.start()
}

/**
 * Start the crackle generator (random pops)
 */
function startCrackleGenerator(): void {
  if (crackleInterval) {
    clearInterval(crackleInterval)
  }
  
  crackleInterval = window.setInterval(() => {
    if (!audioContext || !crackleGain) return
    
    // Random chance of crackle
    if (Math.random() > 0.3) return
    
    // Create a short click/pop
    const osc = audioContext.createOscillator()
    const clickGain = audioContext.createGain()
    
    osc.type = 'square'
    osc.frequency.value = 100 + Math.random() * 200
    
    const now = audioContext.currentTime
    clickGain.gain.setValueAtTime(0.5 + Math.random() * 0.5, now)
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.01 + Math.random() * 0.02)
    
    osc.connect(clickGain)
    clickGain.connect(crackleGain)
    
    osc.start(now)
    osc.stop(now + 0.05)
  }, 100)  // Check every 100ms
}

/**
 * Set noise level (0-1)
 */
export function setNoiseLevel(level: number): void {
  if (noiseGain && audioContext) {
    // Map to 0-0.025 for very subtle hiss
    noiseGain.gain.setTargetAtTime(level * 0.025, audioContext.currentTime, 0.1)
  }
}

/**
 * Set crackle level (0-1)
 */
export function setCrackleLevel(level: number): void {
  if (crackleGain && audioContext) {
    // Map to 0-0.1 for subtle to noticeable pops
    crackleGain.gain.setTargetAtTime(level * 0.1, audioContext.currentTime, 0.1)
  }
}
