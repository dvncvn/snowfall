/**
 * Canvas setup and utilities
 */

export function createCanvas(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!
  
  // handle high-DPI displays
  const dpr = window.devicePixelRatio || 1

  function resize() {
    const width = window.innerWidth
    const height = window.innerHeight
    
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    
    ctx.scale(dpr, dpr)
    
    // reset scale on each resize
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  return { ctx, resize, dpr }
}
