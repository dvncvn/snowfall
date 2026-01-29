/**
 * Snowflake renderer with multiple visual modes
 */

import type { Snowflake } from './snowflake'

export type RenderMode = 'soft' | 'pixel'

let currentMode: RenderMode = 'pixel'

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
  
  // Scale up sizes
  const size = Math.max(3, Math.floor(flake.size * 1.5))
  
  // Different shapes based on position for variety
  const shapeVariant = (x + y) % 4
  
  if (size <= 4) {
    // Small: 3x3 shapes
    if (shapeVariant < 2) {
      ctx.fillRect(x + 1, y, 1, 1)
      ctx.fillRect(x, y + 1, 3, 1)
      ctx.fillRect(x + 1, y + 2, 1, 1)
    } else {
      ctx.fillRect(x + 1, y, 1, 1)
      ctx.fillRect(x, y + 1, 3, 1)
      ctx.fillRect(x + 1, y + 2, 1, 1)
    }
  } else if (size <= 7) {
    // Medium: 5x5 shapes
    if (shapeVariant === 0) {
      ctx.fillRect(x + 2, y, 1, 1)
      ctx.fillRect(x + 1, y + 1, 3, 1)
      ctx.fillRect(x, y + 2, 5, 1)
      ctx.fillRect(x + 1, y + 3, 3, 1)
      ctx.fillRect(x + 2, y + 4, 1, 1)
    } else if (shapeVariant === 1) {
      ctx.fillRect(x + 1, y, 3, 1)
      ctx.fillRect(x, y + 1, 5, 3)
      ctx.fillRect(x + 1, y + 4, 3, 1)
    } else if (shapeVariant === 2) {
      ctx.fillRect(x + 2, y, 1, 1)
      ctx.fillRect(x + 1, y + 1, 3, 1)
      ctx.fillRect(x, y + 2, 5, 1)
      ctx.fillRect(x + 1, y + 3, 3, 1)
      ctx.fillRect(x + 2, y + 4, 1, 1)
    } else {
      ctx.fillRect(x + 2, y, 1, 5)
      ctx.fillRect(x, y + 2, 5, 1)
    }
  } else if (size <= 11) {
    // Large: 8x8 shapes
    if (shapeVariant === 0) {
      ctx.fillRect(x + 3, y, 2, 1)
      ctx.fillRect(x + 2, y + 1, 4, 1)
      ctx.fillRect(x + 1, y + 2, 6, 1)
      ctx.fillRect(x, y + 3, 8, 2)
      ctx.fillRect(x + 1, y + 5, 6, 1)
      ctx.fillRect(x + 2, y + 6, 4, 1)
      ctx.fillRect(x + 3, y + 7, 2, 1)
    } else if (shapeVariant === 1) {
      ctx.fillRect(x, y, 8, 8)
    } else if (shapeVariant === 2) {
      ctx.fillRect(x + 3, y, 2, 8)
      ctx.fillRect(x, y + 3, 8, 2)
      ctx.fillRect(x + 1, y + 1, 2, 2)
      ctx.fillRect(x + 5, y + 1, 2, 2)
      ctx.fillRect(x + 1, y + 5, 2, 2)
      ctx.fillRect(x + 5, y + 5, 2, 2)
    } else {
      ctx.fillRect(x + 3, y, 2, 8)
      ctx.fillRect(x, y + 3, 8, 2)
    }
  } else if (size <= 18) {
    // Extra large: 12x12 shapes
    if (shapeVariant === 0) {
      ctx.fillRect(x + 5, y, 2, 1)
      ctx.fillRect(x + 4, y + 1, 4, 1)
      ctx.fillRect(x + 3, y + 2, 6, 1)
      ctx.fillRect(x + 2, y + 3, 8, 1)
      ctx.fillRect(x + 1, y + 4, 10, 1)
      ctx.fillRect(x, y + 5, 12, 2)
      ctx.fillRect(x + 1, y + 7, 10, 1)
      ctx.fillRect(x + 2, y + 8, 8, 1)
      ctx.fillRect(x + 3, y + 9, 6, 1)
      ctx.fillRect(x + 4, y + 10, 4, 1)
      ctx.fillRect(x + 5, y + 11, 2, 1)
    } else if (shapeVariant === 1) {
      ctx.fillRect(x, y, 12, 12)
    } else if (shapeVariant === 2) {
      ctx.fillRect(x + 5, y, 2, 12)
      ctx.fillRect(x, y + 5, 12, 2)
      ctx.fillRect(x + 2, y + 2, 3, 3)
      ctx.fillRect(x + 7, y + 2, 3, 3)
      ctx.fillRect(x + 2, y + 7, 3, 3)
      ctx.fillRect(x + 7, y + 7, 3, 3)
    } else {
      ctx.fillRect(x + 5, y, 2, 12)
      ctx.fillRect(x, y + 5, 12, 2)
    }
  } else if (size <= 30) {
    // Huge: 20x20 shapes
    const s = 20
    if (shapeVariant === 0) {
      // Diamond
      for (let i = 0; i < s / 2; i++) {
        ctx.fillRect(x + s / 2 - i - 1, y + i, (i + 1) * 2, 1)
      }
      for (let i = 0; i < s / 2; i++) {
        ctx.fillRect(x + i, y + s / 2 + i, s - i * 2, 1)
      }
    } else if (shapeVariant === 1) {
      ctx.fillRect(x, y, s, s)
    } else if (shapeVariant === 2) {
      // Snowflake
      ctx.fillRect(x + s / 2 - 2, y, 4, s)
      ctx.fillRect(x, y + s / 2 - 2, s, 4)
      ctx.fillRect(x + 3, y + 3, 5, 5)
      ctx.fillRect(x + s - 8, y + 3, 5, 5)
      ctx.fillRect(x + 3, y + s - 8, 5, 5)
      ctx.fillRect(x + s - 8, y + s - 8, 5, 5)
    } else {
      ctx.fillRect(x + s / 2 - 2, y, 4, s)
      ctx.fillRect(x, y + s / 2 - 2, s, 4)
    }
  } else {
    // Massive: scaled to actual size
    const s = Math.floor(size)
    if (shapeVariant === 0) {
      // Diamond
      for (let i = 0; i < s / 2; i++) {
        const w = Math.floor((i + 1) * 2)
        ctx.fillRect(x + Math.floor(s / 2) - i - 1, y + i, w, 1)
      }
      for (let i = 0; i < s / 2; i++) {
        const w = s - i * 2
        ctx.fillRect(x + i, y + Math.floor(s / 2) + i, w, 1)
      }
    } else if (shapeVariant === 1) {
      ctx.fillRect(x, y, s, s)
    } else if (shapeVariant === 2) {
      // Big snowflake
      const armW = Math.max(2, Math.floor(s / 5))
      ctx.fillRect(x + Math.floor(s / 2 - armW / 2), y, armW, s)
      ctx.fillRect(x, y + Math.floor(s / 2 - armW / 2), s, armW)
      const cornerSize = Math.floor(s / 4)
      ctx.fillRect(x + armW, y + armW, cornerSize, cornerSize)
      ctx.fillRect(x + s - armW - cornerSize, y + armW, cornerSize, cornerSize)
      ctx.fillRect(x + armW, y + s - armW - cornerSize, cornerSize, cornerSize)
      ctx.fillRect(x + s - armW - cornerSize, y + s - armW - cornerSize, cornerSize, cornerSize)
    } else {
      const armW = Math.max(2, Math.floor(s / 5))
      ctx.fillRect(x + Math.floor(s / 2 - armW / 2), y, armW, s)
      ctx.fillRect(x, y + Math.floor(s / 2 - armW / 2), s, armW)
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
  
  // Use dark flakes for light mode, white for dark mode
  const isLightMode = document.documentElement.getAttribute('data-theme') === 'light'
  ctx.fillStyle = isLightMode ? '#2a2a34' : '#ffffff'
  
  for (const flake of flakes) {
    renderFlake(ctx, flake)
  }
  
  ctx.globalAlpha = 1
}
