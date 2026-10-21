# @feeef.dev/ui

The Feeef UI kit: tokens, light/dark theme, workspace scaffold, floating glass chrome and
controls shared by every Feeef web app. Live reference: <https://lab.feeef.org/ui>.

Used by:

- Feeef Lab (`feeef.all/backend`, Inertia + React)
- Feeef Cloud console (`cod_pilot_clone/cloud/apps/console`, Next.js)

Product features (Lab voice/image/chat/billing, console resources) stay in their apps and are
built from these pieces.

## Install

Private repo, installed as a git dependency pinned to a tag:

```bash
npm install github:feeefapp/ui#v0.2.0
```

The installing machine (and CI / Docker builds) needs read access to `feeefapp/ui` — an SSH key
or a token in the git URL (`git+https://<token>@github.com/feeefapp/ui.git#v0.2.0`).

Peer dependencies: `react`, `react-dom` (19), `lucide-react`, `intl-messageformat` and the Radix
`dropdown-menu`, `popover`, `select`, `slot`, `tooltip` packages.

## Use

```tsx
import { LabProvider, LabButton, LabTextField } from '@feeef.dev/ui'
// Deep imports for everything else, same layout as src/:
import { LabScaffold } from '@feeef.dev/ui/workspace/scaffold'
import { LabDock } from '@feeef.dev/ui/dock'
import '@feeef.dev/ui/workspace.css'

export function App({ locale, translations, url, children }) {
  return (
    <LabProvider
      i18n={{ locale, translations, url, navigate: (to) => router.visit(to) }}
      services={{ navigate: (to) => router.visit(to) }}
    >
      {children}
    </LabProvider>
  )
}
```

`LabProvider` composes services → i18n → theme → scaffold and loads the brand fonts.

- **i18n**: the host owns `locale`, `dir`, `availableLocales` and a flat `translations` map
  (`{ "lab.common.close": "…" }`, ICU messages). The kit ships English/Arabic/French defaults
  for its own strings (`LAB_UI_MESSAGES`); host translations override them. A language change
  calls `navigate(url + '?hl=<code>')` so the host can persist it. `url` defaults to
  `window.location`.
- **services**: `navigate`, `preferences` (storage), `copyText`, `readClipboard`,
  `downloadText`. Browser defaults; inject your own for routers, tests or embedded hosts.
- Modules that use hooks start with `'use client'`, so they work from Next.js server components.
- Every component imports its own CSS; the host bundler (Vite, Next.js) loads it.

## Develop

```bash
npm install
npm run typecheck
npm test            # pure logic: geometry, springs, sliders, scroll metrics, temporal, actions
npm run build       # dist/ (tsc + explicit .js specifiers + copied CSS)
npm run check       # all of the above + dist/ must match the commit
```

To try changes inside an app before releasing, pack and install the tarball (a symlink would
load a second React):

```bash
npm run build && npm pack
cd ../backend && npm install ../ui/feeef-ui-<version>.tgz
```

## Release

`dist/` is committed because consumers install from git.

```bash
npm run release -- patch      # or minor / major / x.y.z: checks, builds, commits, tags
git push --follow-tags
```

Then bump each consumer's `"@feeef.dev/ui": "github:feeefapp/ui#vX.Y.Z"` and reinstall.

## Rules

See [AGENTS.md](AGENTS.md). In short: change shared look and behaviour here, never by
copying or overriding kit files inside an app; keep platform access behind `LabServices`;
update the `/ui` reference in the Lab when a public primitive changes.
