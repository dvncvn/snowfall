/**
 * UI Controls - wires up sidebar controls to system parameters
 */

import { SnowflakeSystem } from './snowflake'
import { setWindConfig } from './wind'
import { setMusicConfig, type ScaleName } from './audio/music'
import { setDelayTime, setDelayFeedback, setDelayMix, setReverbMix, setWarbleRate, setWarbleDepth, setWarbleMix, setWarbleRandom, setNoiseLevel, setCrackleLevel, setMasterVolume, setSynthVolume } from './audio/engine'
import { setWavetablePosition, setSlideParams } from './audio/voice'
import { setScene, type SceneType } from './scene'
import { setDroneEnabled } from './audio/drone'
import { setDitherSize } from './renderer'
import { 
  toggleStep, getPattern, clearPattern, setTempo, setSwing, 
  toggleSequencer, setStepCallback, setPatternCallback, 
  applyFill, setEvolveMode, getEvolveMode, setStutter,
  setStep, getStepValue
} from './sequencer'
import { setDrumVolume, setDrumTone, randomizeDrums, resetDrums } from './audio/drums'

// Theme management
let currentTheme: 'dark' | 'light' = 'dark'

// Base sizes for scaling
const BASE_MIN_SIZE = 2
const BASE_MAX_SIZE = 16

export function initControls(snowflakes: SnowflakeSystem): void {
  // Density slider
  const densitySlider = document.getElementById('density-slider') as HTMLInputElement
  densitySlider.addEventListener('input', () => {
    const value = parseInt(densitySlider.value, 10)
    snowflakes.setConfig({ density: value })
  })

  // Size slider (50-200% of base size)
  const sizeSlider = document.getElementById('size-slider') as HTMLInputElement
  sizeSlider.addEventListener('input', () => {
    const scale = parseInt(sizeSlider.value, 10) / 100
    snowflakes.setConfig({
      minSize: BASE_MIN_SIZE * scale,
      maxSize: BASE_MAX_SIZE * scale
    })
  })

  // Wind slider (0-100 maps to 0-1.0 strength)
  const windSlider = document.getElementById('wind-slider') as HTMLInputElement
  windSlider.addEventListener('input', () => {
    const value = parseInt(windSlider.value, 10) / 100
    setWindConfig({ strength: value })
    // Mark wind as user-controlled
    window.dispatchEvent(new CustomEvent('snowfall:windOverride'))
  })

  // Dither select
  const ditherSelect = document.getElementById('dither-select') as HTMLSelectElement
  ditherSelect.addEventListener('change', () => {
    const size = parseInt(ditherSelect.value, 10)
    setDitherSize(size)
  })
  // Initialize dither from default value
  setDitherSize(parseInt(ditherSelect.value, 10))

  // Scale select
  const scaleSelect = document.getElementById('scale-select') as HTMLSelectElement
  scaleSelect.addEventListener('change', () => {
    const value = scaleSelect.value as ScaleName
    setMusicConfig({ scale: value })
  })

  // Scene select (hidden for now)
  const sceneSelect = document.getElementById('scene-select') as HTMLSelectElement | null
  if (sceneSelect) {
    sceneSelect.addEventListener('change', () => {
      const value = sceneSelect.value as SceneType
      setScene(value)
    })
  }

  // Synth volume slider (separate from drums)
  const synthVolumeSlider = document.getElementById('synth-volume') as HTMLInputElement
  synthVolumeSlider.addEventListener('input', () => {
    const value = parseInt(synthVolumeSlider.value, 10) / 100
    setSynthVolume(value)
  })

  // Wavetable slider
  const wavetableSlider = document.getElementById('wavetable-slider') as HTMLInputElement
  const updateWavetable = () => {
    const value = parseInt(wavetableSlider.value, 10)
    setWavetablePosition(value)
  }
  wavetableSlider.addEventListener('input', updateWavetable)
  wavetableSlider.addEventListener('change', updateWavetable)

  const attackSlider = document.getElementById('attack-slider') as HTMLInputElement
  attackSlider.addEventListener('input', () => {
    const value = parseInt(attackSlider.value, 10) / 100
    setMusicConfig({ baseAttack: value * 0.5 })  // 0-0.5 seconds
  })

  const releaseSlider = document.getElementById('release-slider') as HTMLInputElement
  releaseSlider.addEventListener('input', () => {
    const value = parseInt(releaseSlider.value, 10) / 100
    setMusicConfig({ baseRelease: value * 4 })  // 0-4 seconds
  })

  const reverbSlider = document.getElementById('reverb-slider') as HTMLInputElement
  reverbSlider.addEventListener('input', () => {
    const value = parseInt(reverbSlider.value, 10) / 100
    setMusicConfig({ reverbAmount: value })
    setReverbMix(value)  // Also control overall reverb level
  })

  // Pitch slide controls
  const slideAmountSlider = document.getElementById('slide-amount') as HTMLInputElement
  const slideChanceSlider = document.getElementById('slide-chance') as HTMLInputElement
  const slideDirectionSlider = document.getElementById('slide-direction') as HTMLInputElement
  
  const updateSlide = () => {
    const amount = parseInt(slideAmountSlider.value, 10)
    const chance = parseInt(slideChanceSlider.value, 10) / 100
    const direction = parseInt(slideDirectionSlider.value, 10) / 100
    setSlideParams(amount, chance, direction)
  }
  
  slideAmountSlider.addEventListener('input', updateSlide)
  slideChanceSlider.addEventListener('input', updateSlide)
  slideDirectionSlider.addEventListener('input', updateSlide)

  // Drone toggle
  const droneToggle = document.getElementById('drone-toggle') as HTMLInputElement
  droneToggle.addEventListener('change', () => {
    setDroneEnabled(droneToggle.checked)
  })

  // Delay controls
  const delayTimeSlider = document.getElementById('delay-time') as HTMLInputElement
  delayTimeSlider.addEventListener('input', () => {
    const value = parseInt(delayTimeSlider.value, 10) / 100
    setDelayTime(value * 1.0)  // 0-1 second
  })

  const delayFeedbackSlider = document.getElementById('delay-feedback') as HTMLInputElement
  delayFeedbackSlider.addEventListener('input', () => {
    const value = parseInt(delayFeedbackSlider.value, 10) / 100
    setDelayFeedback(value * 0.85)  // 0-85%
  })

  const delayMixSlider = document.getElementById('delay-mix') as HTMLInputElement
  delayMixSlider.addEventListener('input', () => {
    const value = parseInt(delayMixSlider.value, 10) / 100
    setDelayMix(value)
  })

  // Tape warble controls
  const warbleRateSlider = document.getElementById('warble-rate') as HTMLInputElement
  warbleRateSlider.addEventListener('input', () => {
    const value = parseInt(warbleRateSlider.value, 10) / 100
    setWarbleRate(value)
  })

  const warbleDepthSlider = document.getElementById('warble-depth') as HTMLInputElement
  warbleDepthSlider.addEventListener('input', () => {
    const value = parseInt(warbleDepthSlider.value, 10) / 100
    setWarbleDepth(value)
  })

  const warbleMixSlider = document.getElementById('warble-mix') as HTMLInputElement
  warbleMixSlider.addEventListener('input', () => {
    const value = parseInt(warbleMixSlider.value, 10) / 100
    setWarbleMix(value)
  })

  const warbleRandomToggle = document.getElementById('warble-random') as HTMLInputElement
  warbleRandomToggle.addEventListener('change', () => {
    setWarbleRandom(warbleRandomToggle.checked)
  })

  // Noise controls
  const noiseLevelSlider = document.getElementById('noise-level') as HTMLInputElement
  noiseLevelSlider.addEventListener('input', () => {
    const value = parseInt(noiseLevelSlider.value, 10) / 100
    setNoiseLevel(value)
  })

  const crackleLevelSlider = document.getElementById('crackle-level') as HTMLInputElement
  crackleLevelSlider.addEventListener('input', () => {
    const value = parseInt(crackleLevelSlider.value, 10) / 100
    setCrackleLevel(value)
  })

  // Master volume (near play button)
  const masterVolumeSlider = document.getElementById('master-volume') as HTMLInputElement
  masterVolumeSlider.addEventListener('input', () => {
    const value = parseInt(masterVolumeSlider.value, 10) / 100
    setMasterVolume(value)
  })

  // Reseed button
  const reseedBtn = document.getElementById('reseed-btn') as HTMLButtonElement
  reseedBtn.addEventListener('click', () => {
    // Dispatch custom event for main.ts to handle
    window.dispatchEvent(new CustomEvent('snowfall:reseed'))
  })

  // Theme button
  const themeBtn = document.getElementById('theme-btn') as HTMLButtonElement
  themeBtn.addEventListener('click', toggleTheme)
}

/**
 * Toggle dark/light theme
 */
export function toggleTheme(): void {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark'
  applyTheme()
}

/**
 * Apply current theme
 */
function applyTheme(): void {
  if (currentTheme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light')
  } else {
    document.documentElement.removeAttribute('data-theme')
  }
  updateThemeIcon()
}

/**
 * Update theme icon
 */
function updateThemeIcon(): void {
  const icon = document.getElementById('theme-icon')
  if (!icon) return
  
  if (currentTheme === 'light') {
    // Sun icon for light mode
    icon.innerHTML = '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3" stroke="currentColor" stroke-width="2"/><line x1="12" y1="21" x2="12" y2="23" stroke="currentColor" stroke-width="2"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="currentColor" stroke-width="2"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="currentColor" stroke-width="2"/><line x1="1" y1="12" x2="3" y2="12" stroke="currentColor" stroke-width="2"/><line x1="21" y1="12" x2="23" y2="12" stroke="currentColor" stroke-width="2"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="currentColor" stroke-width="2"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="currentColor" stroke-width="2"/>'
  } else {
    // Moon icon for dark mode
    icon.innerHTML = '<path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/>'
  }
}


/**
 * Get current theme
 */
export function getTheme(): 'dark' | 'light' {
  return currentTheme
}

// ========================================
// Drum Sequencer Controls
// ========================================

const STEPS = 16

/**
 * Initialize drum sequencer UI and controls
 */
export function initSequencerControls(): void {
  // Drag state for painting steps
  let isDragging = false
  let paintMode: 'add' | 'remove' | null = null
  let dragStartStep: { track: number; step: number } | null = null
  let hasDragged = false  // Track if we moved to a different step
  
  // Helper to update step button UI
  const updateStepUI = (btn: HTMLButtonElement, subdiv: number) => {
    btn.classList.toggle('active', subdiv > 0)
    btn.setAttribute('data-subdiv', String(subdiv))
  }
  
  // Helper to get step button by track/step
  const getStepButton = (track: number, step: number): HTMLButtonElement | null => {
    return document.querySelector(`.seq-step[data-track="${track}"][data-step="${step}"]`)
  }
  
  // Create step buttons for each track
  const tracks = document.querySelectorAll('.seq-track')
  tracks.forEach((track) => {
    const trackIndex = parseInt(track.getAttribute('data-track') || '0', 10)
    const stepsContainer = track.querySelector('.seq-steps')
    if (!stepsContainer) return

    for (let step = 0; step < STEPS; step++) {
      const btn = document.createElement('button')
      btn.className = 'seq-step'
      btn.setAttribute('data-track', String(trackIndex))
      btn.setAttribute('data-step', String(step))
      btn.setAttribute('data-subdiv', '0')
      
      // Mousedown: start drag, determine paint mode
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault()
        isDragging = true
        hasDragged = false
        dragStartStep = { track: trackIndex, step }
        
        const currentValue = getStepValue(trackIndex, step)
        if (currentValue === 0) {
          // Empty step: we're adding
          paintMode = 'add'
          setStep(trackIndex, step, 1)
          updateStepUI(btn, 1)
        } else {
          // Active step: we're removing (drag) or cycling (click)
          paintMode = 'remove'
        }
      })
      
      // Mouseover during drag: paint
      btn.addEventListener('mouseenter', () => {
        if (!isDragging || !paintMode) return
        
        const currentValue = getStepValue(trackIndex, step)
        hasDragged = true
        
        if (paintMode === 'add' && currentValue === 0) {
          setStep(trackIndex, step, 1)
          updateStepUI(btn, 1)
        } else if (paintMode === 'remove' && currentValue > 0) {
          setStep(trackIndex, step, 0)
          updateStepUI(btn, 0)
        }
      })
      
      stepsContainer.appendChild(btn)
    }
  })
  
  // Global mouseup: end drag
  document.addEventListener('mouseup', () => {
    if (isDragging && dragStartStep && !hasDragged) {
      // This was a click, not a drag
      const { track, step } = dragStartStep
      const btn = getStepButton(track, step)
      if (btn && paintMode === 'remove') {
        // Was active, cycle subdivision (or turn off if at max)
        const newValue = toggleStep(track, step)
        updateStepUI(btn, newValue)
      }
      // If paintMode was 'add', we already set it to 1 on mousedown
    }
    isDragging = false
    paintMode = null
    dragStartStep = null
    hasDragged = false
  })
  
  // Touch support
  let touchTarget: HTMLButtonElement | null = null
  
  document.addEventListener('touchstart', (e) => {
    const target = e.target as HTMLElement
    if (!target.classList.contains('seq-step')) return
    
    e.preventDefault()
    touchTarget = target as HTMLButtonElement
    isDragging = true
    hasDragged = false
    
    const trackIndex = parseInt(target.getAttribute('data-track') || '0', 10)
    const step = parseInt(target.getAttribute('data-step') || '0', 10)
    dragStartStep = { track: trackIndex, step }
    
    const currentValue = getStepValue(trackIndex, step)
    if (currentValue === 0) {
      paintMode = 'add'
      setStep(trackIndex, step, 1)
      updateStepUI(touchTarget, 1)
    } else {
      paintMode = 'remove'
    }
  }, { passive: false })
  
  document.addEventListener('touchmove', (e) => {
    if (!isDragging || !paintMode) return
    
    const touch = e.touches[0]
    if (!touch) return
    
    const element = document.elementFromPoint(touch.clientX, touch.clientY)
    if (!element?.classList.contains('seq-step')) return
    if (element === touchTarget) return  // Still on same step
    
    hasDragged = true
    touchTarget = element as HTMLButtonElement
    
    const trackIndex = parseInt(element.getAttribute('data-track') || '0', 10)
    const step = parseInt(element.getAttribute('data-step') || '0', 10)
    const currentValue = getStepValue(trackIndex, step)
    
    if (paintMode === 'add' && currentValue === 0) {
      setStep(trackIndex, step, 1)
      updateStepUI(touchTarget, 1)
    } else if (paintMode === 'remove' && currentValue > 0) {
      setStep(trackIndex, step, 0)
      updateStepUI(touchTarget, 0)
    }
  }, { passive: false })
  
  document.addEventListener('touchend', () => {
    if (isDragging && dragStartStep && !hasDragged && paintMode === 'remove') {
      // This was a tap on an active step - cycle subdivision
      const { track, step } = dragStartStep
      const btn = getStepButton(track, step)
      if (btn) {
        const newValue = toggleStep(track, step)
        updateStepUI(btn, newValue)
      }
    }
    isDragging = false
    paintMode = null
    dragStartStep = null
    hasDragged = false
    touchTarget = null
  })

  // Play button
  const playBtn = document.getElementById('seq-play') as HTMLButtonElement
  playBtn.addEventListener('click', () => {
    const playing = toggleSequencer()
    playBtn.classList.toggle('playing', playing)
    playBtn.textContent = playing ? 'stop' : 'play'
  })

  // Volume slider
  const volumeSlider = document.getElementById('seq-volume') as HTMLInputElement
  volumeSlider.addEventListener('input', () => {
    const value = parseInt(volumeSlider.value, 10) / 100
    setDrumVolume(value)
  })

  // Tempo slider
  const tempoSlider = document.getElementById('seq-tempo') as HTMLInputElement
  const tempoValue = document.getElementById('seq-tempo-value') as HTMLSpanElement
  tempoSlider.addEventListener('input', () => {
    const bpm = parseInt(tempoSlider.value, 10)
    setTempo(bpm)
    tempoValue.textContent = String(bpm)
  })

  // Swing slider
  const swingSlider = document.getElementById('seq-swing') as HTMLInputElement
  swingSlider.addEventListener('input', () => {
    const value = parseInt(swingSlider.value, 10) / 100
    setSwing(value)
  })

  // Stutter X/Y pad with crosshair lines
  const stutterPad = document.getElementById('seq-stutter-pad') as HTMLDivElement
  const stutterLineH = document.getElementById('seq-stutter-line-h') as HTMLDivElement
  const stutterLineV = document.getElementById('seq-stutter-line-v') as HTMLDivElement
  let isDraggingStutter = false

  // Make X/Y pad 1:1 ratio matching sequencer height
  const resizeXYPad = () => {
    const height = stutterPad.offsetHeight
    if (height > 0) {
      stutterPad.style.width = `${height}px`
    }
  }
  resizeXYPad()
  window.addEventListener('resize', resizeXYPad)

  const updateStutter = (e: MouseEvent | Touch) => {
    const rect = stutterPad.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const y = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height))
    
    // Update crosshair lines
    stutterLineV.style.left = `${x * 100}%`
    stutterLineH.style.top = `${(1 - y) * 100}%`
    
    // Update stutter params
    setStutter(x, y)
  }

  stutterPad.addEventListener('mousedown', (e) => {
    isDraggingStutter = true
    stutterPad.classList.add('active')
    updateStutter(e)
  })

  document.addEventListener('mousemove', (e) => {
    if (isDraggingStutter) {
      updateStutter(e)
    }
  })

  document.addEventListener('mouseup', () => {
    if (isDraggingStutter) {
      isDraggingStutter = false
      stutterPad.classList.remove('active')
    }
  })

  // Touch support
  stutterPad.addEventListener('touchstart', (e) => {
    isDraggingStutter = true
    stutterPad.classList.add('active')
    if (e.touches[0]) updateStutter(e.touches[0])
    e.preventDefault()
  })

  stutterPad.addEventListener('touchmove', (e) => {
    if (isDraggingStutter && e.touches[0]) {
      updateStutter(e.touches[0])
      e.preventDefault()
    }
  })

  stutterPad.addEventListener('touchend', () => {
    isDraggingStutter = false
    stutterPad.classList.remove('active')
  })

  // Tone X/Y pad with crosshair lines
  const tonePad = document.getElementById('seq-tone-pad') as HTMLDivElement
  const toneLineH = document.getElementById('seq-tone-line-h') as HTMLDivElement
  const toneLineV = document.getElementById('seq-tone-line-v') as HTMLDivElement
  let isDraggingTone = false

  // Initialize tone pad at center (0.5, 0.5)
  toneLineV.style.left = '50%'
  toneLineH.style.top = '50%'

  const updateTone = (e: MouseEvent | Touch) => {
    const rect = tonePad.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const y = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height))
    
    // Update crosshair lines
    toneLineV.style.left = `${x * 100}%`
    toneLineH.style.top = `${(1 - y) * 100}%`
    
    // Update tone params (x = filter, y = decay)
    setDrumTone(x, y)
  }

  // Make tone X/Y pad 1:1 ratio
  const resizeTonePad = () => {
    const height = tonePad.offsetHeight
    if (height > 0) {
      tonePad.style.width = `${height}px`
    }
  }
  resizeTonePad()
  window.addEventListener('resize', resizeTonePad)

  tonePad.addEventListener('mousedown', (e) => {
    isDraggingTone = true
    tonePad.classList.add('active')
    updateTone(e)
  })

  document.addEventListener('mousemove', (e) => {
    if (isDraggingTone) {
      updateTone(e)
    }
  })

  document.addEventListener('mouseup', () => {
    if (isDraggingTone) {
      isDraggingTone = false
      tonePad.classList.remove('active')
    }
  })

  // Touch support for tone pad
  tonePad.addEventListener('touchstart', (e) => {
    isDraggingTone = true
    tonePad.classList.add('active')
    if (e.touches[0]) updateTone(e.touches[0])
    e.preventDefault()
  })

  tonePad.addEventListener('touchmove', (e) => {
    if (isDraggingTone && e.touches[0]) {
      updateTone(e.touches[0])
      e.preventDefault()
    }
  })

  tonePad.addEventListener('touchend', () => {
    isDraggingTone = false
    tonePad.classList.remove('active')
  })

  // Evolve button (toggle)
  const evolveBtn = document.getElementById('seq-evolve') as HTMLButtonElement
  evolveBtn.addEventListener('click', () => {
    const newState = !getEvolveMode()
    setEvolveMode(newState)
    evolveBtn.classList.toggle('playing', newState)
  })

  // Fill button
  const fillBtn = document.getElementById('seq-fill') as HTMLButtonElement
  fillBtn.addEventListener('click', () => {
    applyFill()
    updateSequencerUI()
  })

  // Clear button
  const clearBtn = document.getElementById('seq-clear') as HTMLButtonElement
  clearBtn.addEventListener('click', () => {
    clearPattern()
    updateSequencerUI()
  })

  // Randomize drum sounds
  const randomizeBtn = document.getElementById('seq-randomize') as HTMLButtonElement
  randomizeBtn.addEventListener('click', () => {
    randomizeDrums()
  })

  // Reset drum sounds to defaults
  const resetBtn = document.getElementById('seq-reset') as HTMLButtonElement
  resetBtn.addEventListener('click', () => {
    resetDrums()
  })

  // Set up playhead callback
  setStepCallback((step) => {
    updatePlayhead(step)
  })

  // Set up pattern change callback (for evolve mode)
  setPatternCallback(() => {
    updateSequencerUI()
  })
}

/**
 * Update all step button states from pattern
 */
function updateSequencerUI(): void {
  const pattern = getPattern()
  const stepBtns = document.querySelectorAll('.seq-step')
  
  stepBtns.forEach((btn) => {
    const track = parseInt(btn.getAttribute('data-track') || '0', 10)
    const step = parseInt(btn.getAttribute('data-step') || '0', 10)
    const subdiv = pattern[track]?.[step] ?? 0
    btn.classList.toggle('active', subdiv > 0)
    btn.setAttribute('data-subdiv', String(subdiv))
  })
}

/**
 * Update playhead position
 */
function updatePlayhead(currentStep: number): void {
  const stepBtns = document.querySelectorAll('.seq-step')
  
  stepBtns.forEach((btn) => {
    const step = parseInt(btn.getAttribute('data-step') || '0', 10)
    btn.classList.toggle('playing', step === currentStep)
  })
}
