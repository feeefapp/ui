/**
 * The layouts of Apple's iOS 27 Figma reference renders (figma27/*.png, FIGMA-27.md), in pt, with
 * their backdrops: `figma-sheet` (5 × 4 tiles of 120 pt at a 130 pt pitch, backdrops 255 / 235 /
 * 128 / 26 / 0, a 6 pt stripe through each tile, a 48 pt circle, 66 pt in the last row) and
 * `figma-sizes` (4 × 2 tiles of 340 × 320 pt at 350 / 330 pt, backdrops white / ebebeb / a
 * blue→orange gradient / 1a1a1a, a 160×44 bar and a 300×200 capsule with 4 pt stripes).
 * flutter_compare/figma27.dart draws the same.
 */
export type FigmaShape = { id: string; x: number; y: number; w: number; h: number; r: number; row: number }
export type FigmaLayout = { width: number; height: number; shapes: FigmaShape[]; paint: (context: CanvasRenderingContext2D) => void }

const SHEET_BG = [255, 235, 128, 26, 0]
const SIZES_BG = ['#ffffff', '#ebebeb', 'gradient', '#1a1a1a']
const grey = (v: number) => `rgb(${v} ${v} ${v})`

export function figmaLayout(name: string): FigmaLayout | null {
  if (name === 'figma-sheet') {
    const shapes: FigmaShape[] = []
    for (let row = 0; row < 4; row++)
      for (let col = 0; col < 5; col++) {
        const size = row === 3 ? 66 : 48
        const cx = col * 130 + 60
        const cy = row * 130 + 60
        shapes.push({ id: `r${row}c${col}`, x: cx - size / 2, y: cy - size / 2, w: size, h: size, r: size / 2, row })
      }
    return {
      width: 640,
      height: 510,
      shapes,
      paint: (c) => {
        c.fillStyle = grey(128)
        c.fillRect(0, 0, 640, 510)
        for (let row = 0; row < 4; row++)
          for (let col = 0; col < 5; col++) {
            const v = SHEET_BG[col]
            c.fillStyle = grey(v)
            c.fillRect(col * 130, row * 130, 120, 120)
            c.fillStyle = v >= 200 ? grey(0) : grey(255)
            c.fillRect(col * 130, row * 130 + 57, 120, 6)
          }
      },
    }
  }
  if (name === 'figma-sizes') {
    const shapes: FigmaShape[] = []
    for (let row = 0; row < 2; row++)
      for (let col = 0; col < 4; col++) {
        const x0 = col * 350
        const y0 = row * 330
        shapes.push({ id: `bar-r${row}c${col}`, x: x0 + 90, y: y0 + 20, w: 160, h: 44, r: 22, row })
        shapes.push({ id: `capsule-r${row}c${col}`, x: x0 + 20, y: y0 + 100, w: 300, h: 200, r: 100, row })
      }
    return {
      width: 1400,
      height: 660,
      shapes,
      paint: (c) => {
        c.fillStyle = grey(128)
        c.fillRect(0, 0, 1400, 660)
        for (let row = 0; row < 2; row++)
          for (let col = 0; col < 4; col++) {
            const x0 = col * 350
            const y0 = row * 330
            const bg = SIZES_BG[col]
            if (bg === 'gradient') {
              const g = c.createLinearGradient(x0, 0, x0 + 340, 0)
              g.addColorStop(0, 'rgb(192 210 243)')
              g.addColorStop(1, 'rgb(250 219 179)')
              c.fillStyle = g
            } else c.fillStyle = bg
            c.fillRect(x0, y0, 340, 320)
            c.fillStyle = bg === '#1a1a1a' ? grey(255) : grey(0)
            c.fillRect(x0, y0 + 40, 340, 4)
            c.fillRect(x0, y0 + 198, 340, 4)
          }
      },
    }
  }
  return null
}
