import { createRoot } from 'react-dom/client'
import { Provider } from '@feeef.dev/ui/provider'
import type { Density, Palette } from '@feeef.dev/ui/theme-config'
import { SCENES } from './scenes'
import './parity.css'

const query = new URLSearchParams(location.search)
const scene = SCENES[query.get('scene') ?? 'buttons'] ?? (() => 'Unknown scene')
const mode = query.get('theme') === 'dark' ? 'dark' : 'light'

createRoot(document.getElementById('root')!).render(
  <Provider
    // Each capture starts clean: no stored theme mode, English, left to right unless asked.
    services={{ preferences: { get: () => null, set: () => {}, remove: () => {} } }}
    i18n={{ locale: query.get('dir') === 'rtl' ? 'ar' : 'en', dir: query.get('dir') === 'rtl' ? 'rtl' : 'ltr' }}
    initialTheme={mode}
    theme={{ palette: (query.get('palette') ?? 'lab') as Palette, density: (query.get('density') ?? 'comfortable') as Density }}
  >
    {/* Apps render under .lab-app (it scopes control details such as the texture clip). */}
    <div className="lab-app">
      <div id="stage">{scene()}</div>
    </div>
  </Provider>
)
