import { createCanvas } from './canvas'
import { SnowflakeSystem, Snowflake } from './snowflake'
import { updateWind, resetWind } from './wind'
import { reseedNoise, prefersReducedMotion } from './utils'
import { initAudio, resumeAudio, isAudioReady } from './audio/engine'
import { triggerNote, triggerTwinkle } from './audio/music'
import { stopAllVoices } from './audio/voice'
import { startDrones, stopDrones } from './audio/drone'
import { initDrums } from './audio/drums'
import { stopSequencer } from './sequencer'
import { updateEvolution, setDensityCallback, resetEvolution, setWindUserOverride } from './evolution'
import { renderFlakes, applyDither } from './renderer'
import { initControls, toggleTheme, initSequencerControls } from './controls'
import { renderScene } from './scene'

// state
let isPlaying = false
let animationId: number | null = null
let audioInitialized = false
let introComplete = false

// elements
const canvas = document.getElementById('canvas') as HTMLCanvasElement
const startBtn = document.getElementById('start-btn') as HTMLButtonElement
const sidebar = document.getElementById('sidebar') as HTMLElement
const intro = document.getElementById('intro') as HTMLElement

// canvas context
const { ctx, resize: resizeCanvas } = createCanvas(canvas)

// snowflake system
const snowflakes = new SnowflakeSystem({
  density: 12  // sparse for cleaner aesthetic
})

// connect evolution density callback
setDensityCallback((density) => {
  snowflakes.setConfig({ density })
})

// (flake.hasTriggered property tracks which flakes have triggered notes)

// Ripple effect system
interface Ripple {
  x: number
  y: number
  radius: number
  maxRadius: number
  opacity: number
}

const ripples: Ripple[] = []

function addRipple(x: number, y: number) {
  // Add multiple staggered ripples
  const baseMax = 50 + Math.random() * 30
  ripples.push({ x, y, radius: 4, maxRadius: baseMax, opacity: 0.9 })
  
  setTimeout(() => {
    ripples.push({ x, y, radius: 4, maxRadius: baseMax + 20, opacity: 0.7 })
  }, 80)
  
  setTimeout(() => {
    ripples.push({ x, y, radius: 4, maxRadius: baseMax + 40, opacity: 0.5 })
  }, 160)
}

function updateRipples(delta: number) {
  for (let i = ripples.length - 1; i >= 0; i--) {
    const ripple = ripples[i]!
    ripple.radius += delta * 70  // expansion speed
    ripple.opacity *= 0.99  // gradual fade
    
    if (ripple.radius >= ripple.maxRadius || ripple.opacity < 0.05) {
      ripples.splice(i, 1)
    }
  }
}

// Draw a pixelated circle using midpoint algorithm
function drawPixelCircle(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number) {
  const r = Math.floor(radius)
  if (r < 2) return
  
  const pixelSize = 2
  const points: [number, number][] = []
  
  // Midpoint circle algorithm
  let x = r
  let y = 0
  let err = 1 - r
  
  while (x >= y) {
    // 8 octants
    points.push([cx + x, cy + y])
    points.push([cx + y, cy + x])
    points.push([cx - y, cy + x])
    points.push([cx - x, cy + y])
    points.push([cx - x, cy - y])
    points.push([cx - y, cy - x])
    points.push([cx + y, cy - x])
    points.push([cx + x, cy - y])
    
    y++
    if (err < 0) {
      err += 2 * y + 1
    } else {
      x--
      err += 2 * (y - x) + 1
    }
  }
  
  // Draw pixels
  for (const [px, py] of points) {
    const snapX = Math.floor(px / pixelSize) * pixelSize
    const snapY = Math.floor(py / pixelSize) * pixelSize
    ctx.fillRect(snapX, snapY, pixelSize, pixelSize)
  }
}

function renderRipples(ctx: CanvasRenderingContext2D) {
  const isLightMode = document.documentElement.getAttribute('data-theme') === 'light'
  ctx.fillStyle = isLightMode ? '#2a2a34' : '#ffffff'
  
  for (const ripple of ripples) {
    ctx.globalAlpha = ripple.opacity * 0.7
    drawPixelCircle(ctx, ripple.x, ripple.y, ripple.radius)
  }
  
  ctx.globalAlpha = 1
}

// resize handler
function resize() {
  resizeCanvas()
  snowflakes.resize(window.innerWidth, window.innerHeight)
}

// trigger notes from new flakes
function processAudioTriggers(flakes: readonly Snowflake[]) {
  if (!isAudioReady()) return

  const width = window.innerWidth
  const height = window.innerHeight

  for (const flake of flakes) {
    // Only trigger once per flake, when it reaches ~15% down the screen
    if (flake.hasTriggered) continue
    if (flake.y < height * 0.15) continue
    if (flake.opacity < 0.3) continue

    // Mark as triggered (resets when flake is recycled)
    ;(flake as { hasTriggered: boolean }).hasTriggered = true

    // Normalize position
    const x = flake.x / width
    const y = flake.y / height
    const size = (flake.size - 1.5) / 2.5  // normalize based on min/max size

    triggerNote(x, y, size)
  }
}

// animation loop
let lastTime = 0

function render(time: number) {
  const delta = lastTime ? (time - lastTime) / 1000 : 0
  lastTime = time

  // update systems
  updateWind(delta)
  updateEvolution(delta)
  snowflakes.update(delta)
  updateRipples(delta)

  // clear canvas
  ctx.fillStyle = getComputedStyle(document.documentElement)
    .getPropertyValue('--bg')
    .trim()
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // render snowflakes
  const flakes = snowflakes.getActiveFlakes()
  renderFlakes(ctx, flakes)

  // render ripples
  renderRipples(ctx)

  // render scene (ground/landscape)
  renderScene(ctx, window.innerWidth, window.innerHeight)

  // apply dither effect
  applyDither(ctx, canvas.width, canvas.height)

  // process audio triggers
  processAudioTriggers(flakes)

  if (isPlaying) {
    animationId = requestAnimationFrame(render)
  }
}

// Start visuals only (no audio)
function startVisuals() {
  if (isPlaying) return
  isPlaying = true
  lastTime = 0
  animationId = requestAnimationFrame(render)
}

// Start audio (requires user gesture)
async function startAudio() {
  if (!audioInitialized) {
    await initAudio()
    initDrums()  // Initialize drum bus after audio context
    audioInitialized = true
  }
  await resumeAudio()
  startDrones()
}

async function start() {
  if (isPlaying) return

  startVisuals()
  await startAudio()
  updatePlayButton()
}

function stop() {
  isPlaying = false
  if (animationId !== null) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
  stopAllVoices()
  stopDrones()
  stopSequencer()
  updatePlayButton()
}

function toggle() {
  if (isPlaying) {
    stop()
  } else {
    start()
  }
}

function reseed() {
  reseedNoise()
  resetWind()
  resetEvolution()
  snowflakes.clear()
}

function updatePlayButton() {
  // Pixel art style icons - stepped triangle for play, bars for pause
  startBtn.innerHTML = isPlaying
    ? `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
        <rect x="3" y="2" width="4" height="12" />
        <rect x="9" y="2" width="4" height="12" />
      </svg>`
    : `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
        <rect x="4" y="2" width="3" height="12" />
        <rect x="7" y="4" width="3" height="8" />
        <rect x="10" y="6" width="3" height="4" />
      </svg>`
  startBtn.classList.toggle('playing', isPlaying)
}

function toggleSidebar() {
  sidebar.classList.toggle('hidden')
}

function toggleDrumSequencer() {
  const sequencer = document.getElementById('drum-sequencer')
  if (sequencer) {
    sequencer.classList.toggle('hidden')
  }
}

// event listeners
startBtn.addEventListener('click', toggle)

// Canvas click for twinkle sounds and ripples
canvas.addEventListener('click', (e) => {
  if (!isPlaying) return
  
  // Add visual ripple
  addRipple(e.clientX, e.clientY)
  
  // Trigger audio if ready
  if (isAudioReady()) {
    const x = e.clientX / window.innerWidth
    const y = e.clientY / window.innerHeight
    triggerTwinkle(x, y)
  }
})

window.addEventListener('resize', resize)

window.addEventListener('snowfall:reseed', reseed)

window.addEventListener('snowfall:windOverride', () => {
  setWindUserOverride(true)
})

document.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement) return
  
  switch (e.key.toLowerCase()) {
    case ' ':
      e.preventDefault()
      toggle()
      break
    case 'h':
      toggleSidebar()
      break
    case 'r':
      reseed()
      break
    case 'd':
      toggleDrumSequencer()
      break
    case 't':
      toggleTheme()
      break
  }
})

// initial setup
resize()
initControls(snowflakes)
initSequencerControls()

// Ensure sidebar starts hidden
sidebar.classList.add('hidden')

// Respect reduced motion preference
if (prefersReducedMotion()) {
  snowflakes.setConfig({ density: 10, minSpeed: 10, maxSpeed: 30 })
}

// render initial frame (stopped state)
requestAnimationFrame(() => {
  ctx.fillStyle = getComputedStyle(document.documentElement)
    .getPropertyValue('--bg')
    .trim()
  ctx.fillRect(0, 0, canvas.width, canvas.height)
})

// Intro sequence
let userGestured = false

function skipIntro(fromUserGesture = false) {
  if (fromUserGesture) userGestured = true
  if (introComplete) return
  introComplete = true
  
  intro.classList.add('fade-out')
  
  // Start visuals immediately
  setTimeout(() => {
    startVisuals()
    // Only start audio if user has gestured (browser requirement)
    if (userGestured) {
      startAudio()
    }
    updatePlayButton()
  }, 500)
  
  // Remove intro element after fade completes
  setTimeout(() => {
    intro.classList.add('hidden')
  }, 1500)
}

// Auto-advance intro after delay (visuals only, audio needs gesture)
setTimeout(() => {
  if (!introComplete) {
    skipIntro(false)
  }
}, 4000)

// Click or key to start with audio
intro.addEventListener('click', () => skipIntro(true))
document.addEventListener('keydown', (e) => {
  if (!introComplete && (e.key === ' ' || e.key === 'Enter')) {
    e.preventDefault()
    skipIntro(true)
  }
})

// Enable audio on any user interaction after intro
document.addEventListener('click', () => {
  if (introComplete && !userGestured) {
    userGestured = true
    startAudio()
  }
}, { once: true })

document.addEventListener('keydown', () => {
  if (introComplete && !userGestured) {
    userGestured = true
    startAudio()
  }
}, { once: true })
