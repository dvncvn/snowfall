import { createCanvas } from './canvas'
import { SnowflakeSystem } from './snowflake'
import { updateWind } from './wind'
import { reseedNoise } from './utils'

// state
let isPlaying = false
let animationId: number | null = null

// elements
const canvas = document.getElementById('canvas') as HTMLCanvasElement
const startBtn = document.getElementById('start-btn') as HTMLButtonElement
const sidebar = document.getElementById('sidebar') as HTMLElement

// canvas context
const { ctx, resize: resizeCanvas } = createCanvas(canvas)

// snowflake system
const snowflakes = new SnowflakeSystem()

// resize handler
function resize() {
  resizeCanvas()
  snowflakes.resize(window.innerWidth, window.innerHeight)
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

  if (isPlaying) {
    animationId = requestAnimationFrame(render)
  }
}

function start() {
  if (isPlaying) return
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
