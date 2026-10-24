/**
 * The kit's glass over the LGLab backgrounds, laid out like the iOS reference scenes
 * (app/layouts.json): ?layout=shapes-a&bg=photo&theme=light&renderer=css|canvas|default.
 * `renderer` names a ThemeConfig preset: `css` = the measured regular material (tint 1) with blur,
 * `canvas` = the same plus refraction (what the iOS captures show), `default` = the kit defaults.
 * tools/compare_kit.mjs screenshots it at 3x and diffs it against the iOS captures.
 */
import { useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from '@feeef.dev/ui/provider'
import { GlassGroup } from '@feeef.dev/ui/scaffold'
import { GlassContainer } from '@feeef.dev/ui/glass'
import type { ThemeConfig } from '@feeef.dev/ui/theme-config'
import layouts from '../app/layouts.json'
import { backgroundPixels } from './backgrounds'
import { figmaLayout } from './figma27'
import { Button } from '@feeef.dev/ui/primitives/button'

type Shape = { id: string; kind: string; x: number; y: number; w: number; h: number; r?: number }

const query = new URLSearchParams(location.search)
// figma-sheet / figma-sizes: Apple's iOS 27 Figma reference layouts (figma27.ts), own size and backdrop.
const figma = figmaLayout(query.get('layout') ?? '')
const layout: Shape[] = figma
  ? figma.shapes.map((s) => ({ id: s.id, kind: 'rect', x: s.x, y: s.y, w: s.w, h: s.h, r: s.r }))
  : (layouts.layouts as Record<string, Shape[]>)[query.get('layout') ?? 'shapes-a'] ?? []
const stageWidth = figma?.width ?? 402
const stageHeight = figma?.height ?? 874
const bg = query.get('bg') ?? 'photo'
const mode = query.get('theme') === 'dark' ? 'dark' : 'light'
const renderer = query.get('renderer') ?? 'css'
const PRESETS: Record<string, ThemeConfig> = {
  css: { glassTint: 1, glassBlur: true, glassRefraction: false },
  canvas: { glassTint: 1, glassBlur: true, glassRefraction: true },
  default: {},
  // LIGHT-EDGES.md: iOS .regular and .clear against the kit's endpoints, refraction on.
  regular: { glassTint: 1, glassBlur: true, glassRefraction: true },
  clear: { glassTint: 0, glassBlur: false, glassRefraction: true },
}

function Background() {
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const element = canvas.current!
    element.width = stageWidth * 3
    element.height = stageHeight * 3
    const context = element.getContext('2d')!
    if (figma) {
      context.scale(3, 3)
      figma.paint(context)
    } else context.putImageData(new ImageData(backgroundPixels(bg, 1206, 2622), 1206, 2622), 0, 0)
    document.documentElement.setAttribute('data-bg-ready', '')
  }, [])
  return <canvas id="bg" ref={canvas} style={{ width: stageWidth, height: stageHeight }} />
}

const radius = (s: Shape) => (s.kind === 'circle' || s.kind === 'capsule' ? Math.min(s.w, s.h) / 2 : (s.r ?? 0))

function Scene() {
  useEffect(() => {
    // The provider sets the theme attributes in its own effect; mark ready after it.
    const id = setTimeout(() => {
      document.documentElement.setAttribute('data-scene-ready', '')
    }, 50)
    return () => clearTimeout(id)
  }, [])
  return (
    <div id="stage" style={{ width: stageWidth, height: stageHeight }}>
      <Background />
      <GlassContainer light="static" interactive={false} adaptive={false} cornerShape={query.get('corners') === 'round' ? 'round' : undefined} refractionProfile={query.get('profile') === 'gentle' ? 'gentle' : undefined} style={{ position: 'absolute', inset: 0 }}>
        {layout.map((s) => (
          <GlassGroup
            key={s.id}
            style={{
              position: 'absolute',
              left: s.x,
              top: s.y,
              width: s.w,
              height: s.h,
              boxSizing: 'border-box',
              padding: 0,
              ['--lab-glass-radius' as string]: `${radius(s)}px`,
            }}
          />
        ))}
      </GlassContainer>
    </div>
  )
}

/**
 * `?layout=buttons`: the primary (prominent) button in Figma's prominent tile format: rows of
 * backdrops 255 / 128 / 0 with a 6 pt stripe, columns of 36, 44 and 48 pt circles (120 pt tiles)
 * and a 160×44 capsule with a label (200 pt tile); 10 pt grey gaps.
 */
const BUTTON_TILES = [{ w: 120, size: 36 }, { w: 120, size: 44 }, { w: 120, size: 48 }, { w: 200, size: 0 }]
const BUTTON_BG = [255, 128, 0]
function ButtonsScene() {
  useEffect(() => {
    const id = setTimeout(() => {
      document.documentElement.setAttribute('data-scene-ready', '')
      document.documentElement.setAttribute('data-bg-ready', '')
    }, 50)
    return () => clearTimeout(id)
  }, [])
  const xs = BUTTON_TILES.map((_, i) => BUTTON_TILES.slice(0, i).reduce((sum, t) => sum + t.w + 10, 0))
  return (
    <div id="stage" style={{ width: 590, height: 380, background: 'rgb(128 128 128)', position: 'relative' }}>
      {BUTTON_BG.map((v, row) =>
        BUTTON_TILES.map((tile, col) => (
          <div key={`${row}-${col}`} style={{ position: 'absolute', left: xs[col], top: row * 130, width: tile.w, height: 120, background: `rgb(${v} ${v} ${v})` }}>
            <div style={{ position: 'absolute', left: 0, right: 0, top: 57, height: 6, background: v >= 200 ? '#000' : '#fff' }} />
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
              {tile.size ? (
                <Button variant="primary" controlSize="icon" aria-label="Add" style={{ ['--lab-control-height' as string]: `${tile.size}px`, width: tile.size, height: tile.size, minHeight: tile.size }} />
              ) : (
                <Button variant="primary" style={{ ['--lab-control-height' as string]: '44px', width: 160, height: 44, minHeight: 44 }}>Continue</Button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <Provider
    services={{ preferences: { get: () => null, set: () => {}, remove: () => {} } }}
    i18n={{ locale: 'en', dir: 'ltr' }}
    initialTheme={mode}
    theme={{ palette: 'mono', density: 'comfortable', ...(PRESETS[renderer] ?? PRESETS.css), ...(query.get('layout') === 'buttons' ? { primary: '#0088ff' } : {}) }}
  >
    {query.get('layout') === 'buttons' ? <ButtonsScene /> : <Scene />}
  </Provider>
)
