import { lazy, Suspense, type ComponentType } from 'react'
import { createRoot } from 'react-dom/client'
import * as Tooltip from '@radix-ui/react-tooltip'
import { Provider } from '@feeef.dev/ui/provider'
import type { Density, Palette } from '@feeef.dev/ui/theme-config'
import { SCENES } from './scenes'
import './parity.css'

const query = new URLSearchParams(location.search)
const sceneId = query.get('scene') ?? 'buttons'

// `docs:<section>/<page>/<example>` renders a docs example on the docs stage, so its Dart sibling
// (flutter/tool/sync_docs_examples.mjs) can be compared with it.
const docsExamples = import.meta.glob<{ default: ComponentType }>('../../docs/content/**/examples/*.tsx')
function docsScene(id: string) {
  const [section, page, example] = id.split('/')
  const load = docsExamples[`../../docs/content/${section}/${page}/examples/${example}.tsx`]
  if (!load) return () => 'Unknown example'
  const Example = lazy(load)
  return () => (
    <Suspense>
      <Example />
    </Suspense>
  )
}
const docs = sceneId.startsWith('docs:')
const scene = docs ? docsScene(sceneId.slice(5)) : (SCENES[sceneId] ?? (() => 'Unknown scene'))
const mode = query.get('theme') === 'dark' ? 'dark' : 'light'

createRoot(document.getElementById('root')!).render(
  <Provider
    // Each capture starts clean: no stored theme mode, English, left to right unless asked.
    services={{ preferences: { get: () => null, set: () => {}, remove: () => {} } }}
    i18n={{ locale: query.get('dir') === 'rtl' ? 'ar' : 'en', dir: query.get('dir') === 'rtl' ? 'rtl' : 'ltr' }}
    initialTheme={mode}
    theme={{ palette: (query.get('palette') ?? 'lab') as Palette, density: (query.get('density') ?? 'comfortable') as Density }}
  >
    {/* Like the docs app: rail navigation items need a tooltip provider. */}
    <Tooltip.Provider delayDuration={300}>
      {/* Apps render under .lab-app (it scopes control details such as the texture clip). */}
      <div className="lab-app">
        <div id="stage" className={docs ? 'docs-stage' : undefined}>
          {scene()}
        </div>
      </div>
    </Tooltip.Provider>
  </Provider>
)
