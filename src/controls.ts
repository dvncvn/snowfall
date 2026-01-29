/**
 * UI Controls - wires up sidebar controls to system parameters
 */

import { SnowflakeSystem } from './snowflake'
import { setWindConfig } from './wind'
import { setMusicConfig, type ScaleName } from './audio/music'
import { setRenderMode, getRenderMode, type RenderMode } from './renderer'
import { setDelayTime, setDelayFeedback, setDelayMix } from './audio/engine'
import { setWavetablePosition } from './audio/voice'
import { setScene, type SceneType } from './scene'
import { setDroneEnabled } from './audio/drone'

// Theme management
let currentTheme: 'dark' | 'light' = 'dark'

// Base sizes for scaling
const BASE_MIN_SIZE = 2
const BASE_MAX_SIZE = 8

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

  // Scale select
  const scaleSelect = document.getElementById('scale-select') as HTMLSelectElement
  scaleSelect.addEventListener('change', () => {
    const value = scaleSelect.value as ScaleName
    setMusicConfig({ scale: value })
  })

  // Render mode select
  const renderSelect = document.getElementById('render-select') as HTMLSelectElement
  renderSelect.value = getRenderMode()
  renderSelect.addEventListener('change', () => {
    const value = renderSelect.value as RenderMode
    setRenderMode(value)
  })

  // Scene select
  const sceneSelect = document.getElementById('scene-select') as HTMLSelectElement
  sceneSelect.addEventListener('change', () => {
    const value = sceneSelect.value as SceneType
    setScene(value)
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
  })

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
 * Sync UI controls with current state
 */
export function syncRenderModeUI(): void {
  const renderSelect = document.getElementById('render-select') as HTMLSelectElement
  if (renderSelect) {
    renderSelect.value = getRenderMode()
  }
}

/**
 * Get current theme
 */
export function getTheme(): 'dark' | 'light' {
  return currentTheme
}
