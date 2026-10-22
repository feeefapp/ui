/**
 * The kit's glass over the LGLab backgrounds, laid out like the iOS reference scenes
 * (app/layouts.json): ?layout=shapes-a&bg=photo&theme=light&renderer=css|canvas|fill.
 * tools/compare_kit.mjs screenshots it at 3x and diffs it against the iOS captures.
 */
import { useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from '@feeef.dev/ui/provider'
import { GlassGroup } from '@feeef.dev/ui/scaffold'
import { GlassContainer } from '@feeef.dev/ui/glass'
import layouts from '../app/layouts.json'
import { backgroundPixels } from './backgrounds'

type Shape = { id: string; kind: string; x: number; y: number; w: number; h: number; r?: number }

const query = new URLSearchParams(location.search)
const layout = (layouts.layouts as Record<string, Shape[]>)[query.get('layout') ?? 'shapes-a'] ?? []
const bg = query.get('bg') ?? 'photo'
const mode = query.get('theme') === 'dark' ? 'dark' : 'light'
const renderer = query.get('renderer') ?? 'css'

function Background() {
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const element = canvas.current!
    element.width = 1206
    element.height = 2622
    const context = element.getContext('2d')!
    context.putImageData(new ImageData(backgroundPixels(bg, 1206, 2622), 1206, 2622), 0, 0)
    document.documentElement.setAttribute('data-bg-ready', '')
  }, [])
  return <canvas id="bg" ref={canvas} />
}

const radius = (s: Shape) => (s.kind === 'circle' || s.kind === 'capsule' ? Math.min(s.w, s.h) / 2 : (s.r ?? 0))

function Scene() {
  useEffect(() => {
    // The provider sets the theme attributes in its own effect; the renderer goes on after it.
    const id = setTimeout(() => {
      document.documentElement.setAttribute('data-lab-glass-renderer', renderer)
      document.documentElement.setAttribute('data-scene-ready', '')
    }, 50)
    return () => clearTimeout(id)
  }, [])
  return (
    <div id="stage">
      <Background />
      <GlassContainer light="static" interactive={false} adaptive={false} style={{ position: 'absolute', inset: 0 }}>
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

createRoot(document.getElementById('root')!).render(
  <Provider
    services={{ preferences: { get: () => null, set: () => {}, remove: () => {} } }}
    i18n={{ locale: 'en', dir: 'ltr' }}
    initialTheme={mode}
    theme={{ palette: 'mono', density: 'comfortable' }}
  >
    <Scene />
  </Provider>
)
