import { createCanvas } from './canvas'
import { SnowflakeSystem, Snowflake } from './snowflake'
import { updateWind, resetWind } from './wind'
import { reseedNoise, prefersReducedMotion } from './utils'
import { initAudio, resumeAudio, isAudioReady } from './audio/engine'
import { triggerNote, triggerTwinkle } from './audio/music'
import { stopAllVoices } from './audio/voice'
import { startDrones, stopDrones } from './audio/drone'
import { updateEvolution, setDensityCallback, resetEvolution, setWindUserOverride } from './evolution'
import { renderFlakes } from './renderer'
import { initControls, toggleTheme } from './controls'
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
  density: 25  // slightly lower for cleaner sound
})

// connect evolution density callback
setDensityCallback((density) => {
  snowflakes.setConfig({ density })
})

// track flakes that have triggered notes
const triggeredFlakes = new WeakSet<Snowflake>()

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
    // Only trigger once per flake, when it reaches ~20% down the screen
    if (triggeredFlakes.has(flake)) continue
    if (flake.y < height * 0.15) continue
    if (flake.opacity < 0.3) continue

    triggeredFlakes.add(flake)

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

  // clear canvas
  ctx.fillStyle = getComputedStyle(document.documentElement)
    .getPropertyValue('--bg')
    .trim()
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // render snowflakes
  const flakes = snowflakes.getActiveFlakes()
  renderFlakes(ctx, flakes)

  // render scene (ground/landscape)
  renderScene(ctx, window.innerWidth, window.innerHeight)

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
  // Pixel art style icons
  startBtn.innerHTML = isPlaying
    ? `<svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style="image-rendering: pixelated">
        <rect x="3" y="2" width="4" height="12" />
        <rect x="9" y="2" width="4" height="12" />
      </svg>`
    : `<svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style="image-rendering: pixelated">
        <polygon points="4,2 4,14 13,8" />
      </svg>`
  startBtn.classList.toggle('playing', isPlaying)
}

function toggleSidebar() {
  sidebar.classList.toggle('hidden')
}

// event listeners
startBtn.addEventListener('click', toggle)

// Canvas click for twinkle sounds
canvas.addEventListener('click', (e) => {
  if (!isPlaying || !isAudioReady()) return
  
  const x = e.clientX / window.innerWidth
  const y = e.clientY / window.innerHeight
  triggerTwinkle(x, y)
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
      toggleTheme()
      break
  }
})

// initial setup
resize()
initControls(snowflakes)

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
function skipIntro(withAudio = false) {
  if (introComplete) return
  introComplete = true
  
  intro.classList.add('fade-out')
  
  // Start visuals after fade begins
  setTimeout(() => {
    startVisuals()
    if (withAudio) {
      startAudio()
    }
    updatePlayButton()
  }, 500)
  
  // Remove intro element after fade completes
  setTimeout(() => {
    intro.classList.add('hidden')
  }, 1500)
}

// Auto-advance intro after delay (visuals only, no audio)
setTimeout(() => {
  skipIntro(false)
}, 4500)

// Allow click/key to skip intro early (with audio since it's a user gesture)
intro.addEventListener('click', () => skipIntro(true))
document.addEventListener('keydown', (e) => {
  if (!introComplete && (e.key === ' ' || e.key === 'Enter')) {
    e.preventDefault()
    skipIntro(true)
  }
})
