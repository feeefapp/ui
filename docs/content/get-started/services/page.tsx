import { definePage } from '../../../src/model'
import { C, Code } from '../../../src/blocks/code'
import { Callout, DoDont, Lead, Section, Table } from '../../../src/blocks/prose'
import { Link } from '../../../src/router'

function Overview() {
  return (
    <>
      <Lead>
        Kit widgets never touch the router, storage or clipboard directly. They call a small set of
        services, which work in a browser out of the box and which your app can replace.
      </Lead>

      <Section title="Why services">
        <p>
          A docs site, a Next.js app, an Inertia app, a test runner and an embedded webview all
          navigate and store data differently. Injecting those dependencies keeps every widget the same
          everywhere: the language switcher calls <C>navigate</C> instead of assigning{' '}
          <C>window.location</C>, and the theme switch calls <C>preferences</C> instead of{' '}
          <C>localStorage</C>. Your own components can use the same services through{' '}
          <C>useLabServices()</C>.
        </p>
      </Section>

      <Section title="The services">
        <Table
          head={['Service', 'Browser default', 'Used by']}
          rows={[
            [<C>{'navigate(url)'}</C>, <C>window.location.assign(url)</C>, 'Language changes (unless i18n.navigate is set).'],
            [
              <C>preferences</C>,
              <><C>localStorage</C>, errors swallowed</>,
              <>The color mode (<C>feeef-lab-theme</C>).</>,
            ],
            [<C>{'copyText(text)'}</C>, <C>navigator.clipboard.writeText</C>, 'Your copy actions (this site’s code blocks use it).'],
            [<C>readClipboard()</C>, <C>navigator.clipboard.read</C>, 'Pasting images into the image prompt composer.'],
            [<C>{'downloadText(filename, content, mediaType)'}</C>, 'A temporary Blob link', 'Your exports.'],
          ]}
        />
        <p>
          <C>preferences</C> has <C>get(key)</C> (returns <C>null</C> when missing), <C>set(key, value)</C>{' '}
          and <C>remove(key)</C>. The clipboard functions reject when the clipboard is unavailable, so
          always handle the error.
        </p>
      </Section>

      <Section title="Supply your own">
        <p>
          Pass only what you want to change; everything else keeps its browser default. Keep the object
          stable (define it outside the component or memoize it) so consumers do not re-render.
        </p>
        <Code
          title="Inertia"
          code={`import { router } from '@inertiajs/react'
import { LabProvider } from '@feeef.dev/ui/provider'
import type { LabServices } from '@feeef.dev/ui/services'

const services: Partial<LabServices> = {
  navigate: (url) => router.visit(url),
}

export function Root({ children }: { children: React.ReactNode }) {
  return <LabProvider services={services}>{children}</LabProvider>
}`}
        />
        <Code
          title="Next.js (app router)"
          code={`'use client'
import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { LabProvider } from '@feeef.dev/ui/provider'

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const services = useMemo(() => ({ navigate: (url: string) => router.push(url) }), [router])
  return <LabProvider services={services}>{children}</LabProvider>
}`}
        />
        <p>
          Storing preferences in a cookie lets the server render the reader’s color mode (see{' '}
          <Link to="/get-started/theming">Theming</Link>):
        </p>
        <Code
          code={`const cookiePreferences: LabServices['preferences'] = {
  get: (key) => document.cookie.match(new RegExp(\`(?:^|; )\${key}=([^;]*)\`))?.[1] ?? null,
  set: (key, value) => {
    document.cookie = \`\${key}=\${value}; path=/; max-age=31536000; samesite=lax\`
  },
  remove: (key) => {
    document.cookie = \`\${key}=; path=/; max-age=0\`
  },
}

<LabProvider services={{ preferences: cookiePreferences }}>…</LabProvider>`}
        />
      </Section>

      <Section title="Use them in your components">
        <Code
          code={`import { useLabServices } from '@feeef.dev/ui/services'
import { LabButton } from '@feeef.dev/ui/primitives/button'

export function ExportButton({ rows }: { rows: string[][] }) {
  const { downloadText } = useLabServices()
  return (
    <LabButton
      variant="outlined"
      onClick={() => downloadText('orders.csv', rows.map((r) => r.join(',')).join('\\n'), 'text/csv')}
    >
      Export CSV
    </LabButton>
  )
}`}
        />
        <p>
          Without a provider, <C>useLabServices()</C> returns the browser defaults, so components still
          work in isolation.
        </p>
      </Section>

      <Section title="Testing">
        <p>
          Services are the seam for tests: render under a provider with fakes and assert on calls,
          without a real router, storage or clipboard.
        </p>
        <Code
          code={`import { LabServicesProvider } from '@feeef.dev/ui/services'

const memory = new Map<string, string>()
const calls: string[] = []

render(
  <LabServicesProvider
    services={{
      navigate: (url) => calls.push(url),
      preferences: {
        get: (k) => memory.get(k) ?? null,
        set: (k, v) => void memory.set(k, v),
        remove: (k) => void memory.delete(k),
      },
      copyText: async (text) => void calls.push(\`copy:\${text}\`),
    }}
  >
    <OrderActions />
  </LabServicesProvider>
)`}
        />
        <Callout title="Full provider in tests">
          <p>
            Widgets that also need translations or the theme (for example <C>LabThemeSwitch</C>) need{' '}
            <C>LabProvider</C>, which takes the same <C>services</C> prop.
          </p>
        </Callout>
      </Section>

      <Section title="Guidelines">
        <DoDont
          doItems={[
            'Route navigation through your router so client-side transitions keep state.',
            <>Use <C>useLabServices()</C> in shared components instead of browser globals.</>,
            'Handle clipboard rejections with a visible message.',
          ]}
          dontItems={[
            <>Read <C>localStorage</C> or <C>navigator.clipboard</C> in a leaf component.</>,
            'Create a new services object on every render.',
            'Store anything sensitive in preferences; it is plain client storage.',
          ]}
        />
      </Section>
    </>
  )
}

export default definePage({
  section: 'get-started',
  id: 'services',
  title: 'Services',
  order: 4,
  summary: 'Inject navigation, storage, clipboard and downloads so kit widgets work in any host and in tests.',
  keywords: ['LabServices', 'useLabServices', 'navigate', 'router', 'preferences', 'clipboard', 'download', 'testing'],
  Overview,
})
