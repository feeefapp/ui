/** Ordered 8×8 dithering, inspired by the Wave reference; transparent CPU paint avoids GPU driver artifacts. */
export function installFoPixelFallback(
  original: HTMLCanvasElement,
  options: { density?: number; speed?: number } = {}
) {
  const canvas = document.createElement('canvas')
  canvas.className = original.className
  canvas.style.cssText = original.style.cssText
  canvas.setAttribute('aria-hidden', 'true')
  original.after(canvas)
  const display = original.style.display
  original.style.display = 'none'
  const context = canvas.getContext('2d')
  if (!context) {
    canvas.remove()
    original.style.display = display
    return () => {}
  }
  const bayer = [
    0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60,
    28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47,
    7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21,
  ]
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  let frame = 0,
    last = 0,
    time = 1.7,
    visible = true,
    dead = false
  const ripples: { x: number; y: number; time: number }[] = []
  function draw() {
    const ctx = context!,
      width = canvas.width,
      height = canvas.height,
      step = 4
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = getComputedStyle(canvas).getPropertyValue('--lab-pixel-ink').trim() || '#86e672'
    for (let y = 0; y < height; y += step)
      for (let x = 0; x < width; x += step) {
        const u = x / Math.max(1, width),
          v = y / Math.max(1, height)
        const crest =
          0.48 + 0.22 * Math.sin(u * 7.2 + time) + 0.11 * Math.sin(u * 13.1 - time * 0.63)
        const band = Math.exp(-(((v - crest) / 0.22) ** 2))
        const fold = 0.5 + 0.5 * Math.sin(u * 11 + v * 5 - time * 0.42)
        let strength = band * (0.23 + fold * 0.38) * Math.min(1.35, options.density ?? 1.2)
        for (const ripple of ripples) {
          const age = time - ripple.time,
            distance = Math.hypot((x - ripple.x) / width, (y - ripple.y) / height)
          strength +=
            Math.exp(-(((distance - age * 0.16) / 0.045) ** 2)) * Math.exp(-age * 2) * 0.35
        }
        const threshold = (bayer[((y / step) % 8) * 8 + ((x / step) % 8)] + 0.5) / 64
        if (strength <= threshold) continue
        const edge = Math.min(u, v, 1 - u, 1 - v)
        ctx.globalAlpha = Math.min(1, edge / 0.09)
        ctx.fillRect(x, y, 3, 3)
      }
    canvas.dataset.foPixelReady = 'true'
    canvas.dataset.foPixelRenderer = '2d-bayer8'
  }
  function animate(now: number) {
    frame = 0
    if (dead || document.hidden || !visible || reduced.matches) return
    if (now - last >= 1000 / 18) {
      time += Math.min((now - last) / 1000, 0.1) * (options.speed ?? 0.35)
      last = now
      while (ripples.length && time - ripples[0].time > 3) ripples.shift()
      draw()
    }
    frame = requestAnimationFrame(animate)
  }
  function resume() {
    cancelAnimationFrame(frame)
    last = performance.now()
    if (!dead && visible && !document.hidden) {
      draw()
      if (!reduced.matches) frame = requestAnimationFrame(animate)
    }
  }
  function resize() {
    const rect = canvas.getBoundingClientRect(),
      scale = Math.min(1, 1200 / Math.max(1, rect.width))
    canvas.width = Math.max(1, Math.round(rect.width * scale))
    canvas.height = Math.max(1, Math.round(rect.height * scale))
    draw()
  }
  function ripple(event: PointerEvent) {
    if (reduced.matches) return
    const rect = canvas.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    ripples.push({
      x: ((event.clientX - rect.left) * canvas.width) / rect.width,
      y: ((event.clientY - rect.top) * canvas.height) / rect.height,
      time,
    })
    if (ripples.length > 8) ripples.shift()
  }
  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(canvas)
  const visibility = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting
    resume()
  })
  visibility.observe(canvas)
  const theme = new MutationObserver(resume)
  theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-lab-theme'] })
  resize()
  resume()
  document.addEventListener('pointerdown', ripple, { passive: true })
  document.addEventListener('visibilitychange', resume)
  reduced.addEventListener('change', resume)
  return () => {
    dead = true
    cancelAnimationFrame(frame)
    resizeObserver.disconnect()
    visibility.disconnect()
    theme.disconnect()
    document.removeEventListener('pointerdown', ripple)
    document.removeEventListener('visibilitychange', resume)
    reduced.removeEventListener('change', resume)
    canvas.remove()
    original.style.display = display
  }
}
