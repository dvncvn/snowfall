/**
 * Audio engine - manages AudioContext, master chain, and effects
 */

let audioContext: AudioContext | null = null
let masterGain: GainNode | null = null
let reverbGain: GainNode | null = null
let reverbNode: ConvolverNode | null = null
let dryGain: GainNode | null = null

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

  // Dry path
  dryGain = audioContext.createGain()
  dryGain.gain.value = 0.6
  dryGain.connect(masterGain)

  // Reverb path
  reverbGain = audioContext.createGain()
  reverbGain.gain.value = 0.4
  
  // Create impulse response for reverb
  reverbNode = audioContext.createConvolver()
  reverbNode.buffer = createReverbImpulse(audioContext, 2.5, 2)
  
  reverbGain.connect(reverbNode)
  reverbNode.connect(masterGain)
}

/**
 * Create a simple reverb impulse response
 */
function createReverbImpulse(ctx: AudioContext, duration: number, decay: number): AudioBuffer {
  const sampleRate = ctx.sampleRate
  const length = sampleRate * duration
  const buffer = ctx.createBuffer(2, length, sampleRate)
  
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel)
    for (let i = 0; i < length; i++) {
      const t = i / length
      // Exponential decay with random noise
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay)
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
  if (reverbGain && dryGain) {
    reverbGain.gain.setTargetAtTime(mix * 0.6, audioContext!.currentTime, 0.1)
    dryGain.gain.setTargetAtTime(1 - mix * 0.4, audioContext!.currentTime, 0.1)
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
