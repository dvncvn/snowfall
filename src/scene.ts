/**
 * Pixel art scene renderer
 * Subtle atmospheric silhouettes at bottom of canvas
 */

export type SceneType = 'none' | 'hills' | 'city' | 'forest'

let currentScene: SceneType = 'none'

/**
 * Set the current scene type
 */
export function setScene(scene: SceneType): void {
  currentScene = scene
}

/**
 * Get current scene type
 */
export function getScene(): SceneType {
  return currentScene
}

/**
 * Get scene colors based on theme
 */
function getSceneColors(): { far: string; mid: string; near: string } {
  const isLight = document.documentElement.getAttribute('data-theme') === 'light'
  
  if (isLight) {
    return {
      far: 'rgba(180, 180, 190, 0.15)',
      mid: 'rgba(160, 160, 170, 0.2)',
      near: 'rgba(140, 140, 150, 0.25)'
    }
  } else {
    return {
      far: 'rgba(30, 35, 50, 0.4)',
      mid: 'rgba(25, 30, 45, 0.5)',
      near: 'rgba(20, 25, 40, 0.6)'
    }
  }
}

/**
 * Render the scene
 */
export function renderScene(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  if (currentScene === 'none') return
  
  const groundY = height - 40
  
  switch (currentScene) {
    case 'hills':
      renderHills(ctx, width, groundY)
      break
    case 'city':
      renderCity(ctx, width, groundY)
      break
    case 'forest':
      renderForest(ctx, width, groundY)
      break
  }
}

/**
 * Generate evenly spaced positions across width with slight variation
 */
function generatePositions(width: number, spacing: number, offset: number = 0): number[] {
  const positions: number[] = []
  const count = Math.ceil(width / spacing) + 2
  for (let i = 0; i < count; i++) {
    positions.push(offset + i * spacing + (Math.sin(i * 1.7) * spacing * 0.2))
  }
  return positions
}

/**
 * Rolling hills - layered silhouettes
 */
function renderHills(ctx: CanvasRenderingContext2D, width: number, groundY: number): void {
  const colors = getSceneColors()
  
  // Far hills
  ctx.fillStyle = colors.far
  const farHills = generatePositions(width, 250, -50).map((x, i) => ({
    x,
    h: 40 + Math.sin(i * 2.3) * 15
  }))
  drawHillLayer(ctx, width, groundY + 15, farHills)
  
  // Mid hills
  ctx.fillStyle = colors.mid
  const midHills = generatePositions(width, 220, 50).map((x, i) => ({
    x,
    h: 32 + Math.sin(i * 1.9) * 12
  }))
  drawHillLayer(ctx, width, groundY + 8, midHills)
  
  // Near hills
  ctx.fillStyle = colors.near
  const nearHills = generatePositions(width, 180, 0).map((x, i) => ({
    x,
    h: 24 + Math.sin(i * 2.7) * 8
  }))
  drawHillLayer(ctx, width, groundY, nearHills)
}

function drawHillLayer(ctx: CanvasRenderingContext2D, width: number, baseY: number, hills: { x: number; h: number }[]): void {
  ctx.beginPath()
  ctx.moveTo(-50, baseY + 50)
  
  for (const hill of hills) {
    const peakX = hill.x + 90
    
    // Rising edge
    for (let i = 0; i <= 8; i++) {
      const t = i / 8
      const x = hill.x + t * 90
      const y = baseY - hill.h * Math.sin(t * Math.PI / 2)
      ctx.lineTo(x, y)
    }
    
    // Falling edge
    for (let i = 1; i <= 8; i++) {
      const t = i / 8
      const x = peakX + t * 90
      const y = baseY - hill.h * Math.cos(t * Math.PI / 2)
      ctx.lineTo(x, y)
    }
  }
  
  ctx.lineTo(width + 100, baseY + 50)
  ctx.closePath()
  ctx.fill()
}

/**
 * City skyline - simple building silhouettes
 */
function renderCity(ctx: CanvasRenderingContext2D, width: number, groundY: number): void {
  const colors = getSceneColors()
  
  // Far buildings (tallest)
  ctx.fillStyle = colors.far
  const farBuildings = generatePositions(width, 150, 80).map((x, i) => ({
    x,
    w: 35 + Math.abs(Math.sin(i * 1.3)) * 20,
    h: 85 + Math.sin(i * 2.1) * 30
  }))
  drawBuildingLayer(ctx, groundY + 10, farBuildings)
  
  // Mid buildings
  ctx.fillStyle = colors.mid
  const midBuildings = generatePositions(width, 130, 30).map((x, i) => ({
    x,
    w: 35 + Math.abs(Math.sin(i * 1.7)) * 20,
    h: 55 + Math.sin(i * 1.5) * 20
  }))
  drawBuildingLayer(ctx, groundY + 5, midBuildings)
  
  // Near buildings (shortest)
  ctx.fillStyle = colors.near
  const nearBuildings = generatePositions(width, 110, 0).map((x, i) => ({
    x,
    w: 40 + Math.abs(Math.sin(i * 2.3)) * 25,
    h: 35 + Math.sin(i * 1.9) * 15
  }))
  drawBuildingLayer(ctx, groundY, nearBuildings)
}

function drawBuildingLayer(ctx: CanvasRenderingContext2D, baseY: number, buildings: { x: number; w: number; h: number }[]): void {
  for (const b of buildings) {
    ctx.fillRect(b.x, baseY - b.h, b.w, b.h + 20)
  }
}

/**
 * Forest - simple tree silhouettes
 */
function renderForest(ctx: CanvasRenderingContext2D, width: number, groundY: number): void {
  const colors = getSceneColors()
  
  // Far trees (tallest)
  ctx.fillStyle = colors.far
  const farTrees = generatePositions(width, 140, 40).map((x, i) => ({
    x,
    s: 1.2 + Math.sin(i * 1.7) * 0.3
  }))
  drawTreeLayer(ctx, groundY + 12, farTrees)
  
  // Mid trees
  ctx.fillStyle = colors.mid
  const midTrees = generatePositions(width, 120, 0).map((x, i) => ({
    x,
    s: 0.95 + Math.sin(i * 2.1) * 0.2
  }))
  drawTreeLayer(ctx, groundY + 6, midTrees)
  
  // Near trees
  ctx.fillStyle = colors.near
  const nearTrees = generatePositions(width, 140, 60).map((x, i) => ({
    x,
    s: 0.7 + Math.sin(i * 1.5) * 0.15
  }))
  drawTreeLayer(ctx, groundY, nearTrees)
  
  // Ground line
  ctx.fillStyle = colors.near
  ctx.fillRect(0, groundY, width, 8)
}

function drawTreeLayer(ctx: CanvasRenderingContext2D, baseY: number, trees: { x: number; s: number }[]): void {
  for (const tree of trees) {
    drawTree(ctx, tree.x, baseY, tree.s)
  }
}

function drawTree(ctx: CanvasRenderingContext2D, x: number, baseY: number, scale: number): void {
  const h = 50 * scale
  const w = 30 * scale
  
  ctx.beginPath()
  ctx.moveTo(x, baseY)
  ctx.lineTo(x + w / 2, baseY - h)
  ctx.lineTo(x + w, baseY)
  ctx.closePath()
  ctx.fill()
  
  const trunkW = 6 * scale
  ctx.fillRect(x + w / 2 - trunkW / 2, baseY, trunkW, 10)
}
