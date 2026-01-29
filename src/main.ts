import { createCanvas } from './canvas'
import { SnowflakeSystem, Snowflake } from './snowflake'
import { updateWind } from './wind'
import { reseedNoise } from './utils'
import { initAudio, resumeAudio, isAudioReady } from './audio/engine'
import { triggerNote } from './audio/music'
import { stopAllVoices } from './audio/voice'

// state
let isPlaying = false
let animationId: number | null = null
let audioInitialized = false

// elements
const canvas = document.getElementById('canvas') as HTMLCanvasElement
const startBtn = document.getElementById('start-btn') as HTMLButtonElement
const sidebar = document.getElementById('sidebar') as HTMLElement

// canvas context
const { ctx, resize: resizeCanvas } = createCanvas(canvas)

// snowflake system
const snowflakes = new SnowflakeSystem({
  density: 25  // slightly lower for cleaner sound
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
  snowflakes.update(delta)

  // clear canvas
  ctx.fillStyle = getComputedStyle(document.documentElement)
    .getPropertyValue('--bg')
    .trim()
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // render snowflakes
  const flakes = snowflakes.getActiveFlakes()
  ctx.fillStyle = '#ffffff'
  
  for (const flake of flakes) {
    ctx.globalAlpha = flake.opacity
    ctx.beginPath()
    ctx.arc(flake.x, flake.y, flake.size, 0, Math.PI * 2)
    ctx.fill()
  }
  
  ctx.globalAlpha = 1

  // process audio triggers
  processAudioTriggers(flakes)

  if (isPlaying) {
    animationId = requestAnimationFrame(render)
  }
}

async function start() {
  if (isPlaying) return

  // Initialize audio on first start (requires user gesture)
  if (!audioInitialized) {
    await initAudio()
    audioInitialized = true
  }
  await resumeAudio()

  isPlaying = true
  lastTime = 0
  animationId = requestAnimationFrame(render)
  updatePlayButton()
}

function stop() {
  isPlaying = false
  if (animationId !== null) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
  stopAllVoices()
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
  snowflakes.clear()
}

function updatePlayButton() {
  startBtn.innerHTML = isPlaying
    ? `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <rect x="6" y="4" width="4" height="16" />
        <rect x="14" y="4" width="4" height="16" />
      </svg>`
    : `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <polygon points="5,3 19,12 5,21" />
      </svg>`
  startBtn.classList.toggle('playing', isPlaying)
}

function toggleSidebar() {
  sidebar.classList.toggle('hidden')
}

// event listeners
startBtn.addEventListener('click', toggle)

window.addEventListener('resize', resize)

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
  }
})

// initial setup
resize()

// render initial frame (stopped state)
requestAnimationFrame(() => {
  ctx.fillStyle = getComputedStyle(document.documentElement)
    .getPropertyValue('--bg')
    .trim()
  ctx.fillRect(0, 0, canvas.width, canvas.height)
})
