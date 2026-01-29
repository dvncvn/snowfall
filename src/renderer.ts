/**
 * Snowflake renderer with multiple visual modes
 */

import type { Snowflake } from './snowflake'

export type RenderMode = 'soft' | 'pixel'

let currentMode: RenderMode = 'soft'

/**
 * Set the render mode
 */
export function setRenderMode(mode: RenderMode): void {
  currentMode = mode
}

/**
 * Get current render mode
 */
export function getRenderMode(): RenderMode {
  return currentMode
}

/**
 * Toggle between render modes
 */
export function toggleRenderMode(): RenderMode {
  currentMode = currentMode === 'soft' ? 'pixel' : 'soft'
  return currentMode
}

/**
 * Configure canvas for current mode
 */
export function configureCanvas(ctx: CanvasRenderingContext2D): void {
  if (currentMode === 'pixel') {
    // Disable smoothing for crisp pixels
    ctx.imageSmoothingEnabled = false
  } else {
    ctx.imageSmoothingEnabled = true
  }
}

/**
 * Render a single snowflake based on current mode
 */
export function renderFlake(
  ctx: CanvasRenderingContext2D,
  flake: Snowflake
): void {
  ctx.globalAlpha = flake.opacity

  if (currentMode === 'pixel') {
    renderPixelFlake(ctx, flake)
  } else {
    renderSoftFlake(ctx, flake)
  }
}

/**
 * Soft circular flakes (default)
 */
function renderSoftFlake(ctx: CanvasRenderingContext2D, flake: Snowflake): void {
  ctx.beginPath()
  ctx.arc(flake.x, flake.y, flake.size, 0, Math.PI * 2)
  ctx.fill()
}

/**
 * Pixel art style flakes (Fez-inspired)
 */
function renderPixelFlake(ctx: CanvasRenderingContext2D, flake: Snowflake): void {
  // Snap to pixel grid
  const x = Math.floor(flake.x)
  const y = Math.floor(flake.y)
  
  // Scale up sizes: small (3-4), medium (5-6), large (7+)
  const size = Math.max(3, Math.floor(flake.size * 2))
  
  // Different shapes based on position for variety
  const shapeVariant = (x + y) % 4
  
  if (size <= 4) {
    // Small: 3x3 or 4x4 shapes
    if (shapeVariant < 2) {
      // Plus shape
      ctx.fillRect(x + 1, y, 1, 1)
      ctx.fillRect(x, y + 1, 3, 1)
      ctx.fillRect(x + 1, y + 2, 1, 1)
    } else {
      // Small diamond
      ctx.fillRect(x + 1, y, 1, 1)
      ctx.fillRect(x, y + 1, 3, 1)
      ctx.fillRect(x + 1, y + 2, 1, 1)
    }
  } else if (size <= 6) {
    // Medium: 5x5 shapes
    if (shapeVariant === 0) {
      // Diamond
      ctx.fillRect(x + 2, y, 1, 1)
      ctx.fillRect(x + 1, y + 1, 3, 1)
      ctx.fillRect(x, y + 2, 5, 1)
      ctx.fillRect(x + 1, y + 3, 3, 1)
      ctx.fillRect(x + 2, y + 4, 1, 1)
    } else if (shapeVariant === 1) {
      // Square with soft corners
      ctx.fillRect(x + 1, y, 3, 1)
      ctx.fillRect(x, y + 1, 5, 3)
      ctx.fillRect(x + 1, y + 4, 3, 1)
    } else if (shapeVariant === 2) {
      // Plus
      ctx.fillRect(x + 2, y, 1, 1)
      ctx.fillRect(x + 1, y + 1, 3, 1)
      ctx.fillRect(x, y + 2, 5, 1)
      ctx.fillRect(x + 1, y + 3, 3, 1)
      ctx.fillRect(x + 2, y + 4, 1, 1)
    } else {
      // Cross
      ctx.fillRect(x + 2, y, 1, 5)
      ctx.fillRect(x, y + 2, 5, 1)
    }
  } else {
    // Large: 6x6+ shapes
    if (shapeVariant === 0) {
      // Big diamond
      ctx.fillRect(x + 2, y, 2, 1)
      ctx.fillRect(x + 1, y + 1, 4, 1)
      ctx.fillRect(x, y + 2, 6, 2)
      ctx.fillRect(x + 1, y + 4, 4, 1)
      ctx.fillRect(x + 2, y + 5, 2, 1)
    } else if (shapeVariant === 1) {
      // Filled square
      ctx.fillRect(x, y, 6, 6)
    } else if (shapeVariant === 2) {
      // Star-like
      ctx.fillRect(x + 2, y, 2, 1)
      ctx.fillRect(x + 1, y + 1, 4, 1)
      ctx.fillRect(x, y + 2, 6, 2)
      ctx.fillRect(x + 1, y + 4, 4, 1)
      ctx.fillRect(x + 2, y + 5, 2, 1)
    } else {
      // Big cross
      ctx.fillRect(x + 2, y, 2, 6)
      ctx.fillRect(x, y + 2, 6, 2)
    }
  }
}

/**
 * Render all flakes
 */
export function renderFlakes(
  ctx: CanvasRenderingContext2D,
  flakes: readonly Snowflake[]
): void {
  configureCanvas(ctx)
  ctx.fillStyle = '#ffffff'
  
  for (const flake of flakes) {
    renderFlake(ctx, flake)
  }
  
  ctx.globalAlpha = 1
}
