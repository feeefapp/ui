import { definePage } from '../../../src/model'
import { C, Code } from '../../../src/blocks/code'
import { Callout, Section, Table } from '../../../src/blocks/prose'
import { Link } from '../../../src/router'
import pkg from '../../../../package.json'

function Overview() {
  return (
    <>
      <Section title="Install">
        <p>
          The kit is a private git dependency; <C>dist/</C> is committed, so there is no build step on
          install. Pin a release tag.
        </p>
        <Code lang="bash" code={`npm install "@feeef.dev/ui@github:feeefapp/ui#v${pkg.version}"`} />
        <p>It expects these peer dependencies, which most Feeef apps already have:</p>
        <Code
          lang="bash"
          code={`npm install react@19 react-dom@19 lucide-react intl-messageformat \\
  @radix-ui/react-dropdown-menu @radix-ui/react-popover @radix-ui/react-select \\
  @radix-ui/react-slot @radix-ui/react-tooltip`}
        />
      </Section>

      <Section title="Add the provider">
        <p>
          Wrap your app once in <C>LabProvider</C>. It installs services, translations, the theme and
          the floating-layer system that docks, dialogs and menus use.
        </p>
        <Code
          code={`import { LabProvider } from '@feeef.dev/ui/provider'

export function Root({ children }: { children: React.ReactNode }) {
  return (
    <LabProvider
      theme={{ palette: 'lab', density: 'comfortable', radius: 1 }}
      i18n={{ locale: 'en' }}
    >
      {children}
    </LabProvider>
  )
}`}
        />
        <Callout title="Server rendering">
          <p>
            In Next.js or any SSR host, spread <C>labThemeAttributes(theme)</C> onto <C>{'<html>'}</C> so
            the first paint is already themed. See <Link to="/get-started/theming">Theming</Link>.
          </p>
        </Callout>
      </Section>

      <Section title="Use a component">
        <p>
          Import from the module that defines the component. Each module imports its own CSS, so you
          never add stylesheets by hand.
        </p>
        <Code
          code={`import { LabButton } from '@feeef.dev/ui/primitives/button'
import { LabTextField } from '@feeef.dev/ui/primitives/text-field'

export function Signup() {
  return (
    <form>
      <LabTextField hint="Email" type="email" required />
      <LabButton variant="filled" type="submit">Create account</LabButton>
    </form>
  )
}`}
        />
      </Section>

      <Section title="What’s in the kit">
        <Table
          head={['Area', 'Modules']}
          rows={[
            ['Controls', 'Button, icon button, text field, select, checkbox, radio, slider, switch, segmented control, date and time fields'],
            ['Layout', 'Scaffold, scroll area, dock, toolbar, actions bar, filter bar, navigation item'],
            ['Surfaces', 'Modal, popover surface, glass group'],
            ['Foundations', 'Tokens, theme config, motion helpers, pixel art, corners'],
            ['Platform', 'Provider, i18n (en/ar/fr), injected services'],
          ]}
        />
      </Section>

      <Section title="Next steps">
        <ul>
          <li><Link to="/get-started/theming">Theming</Link>: palette, density, radius, dark mode and SSR.</li>
          <li><Link to="/get-started/internationalization">Languages and RTL</Link>: locale, translations and mirrored layouts.</li>
          <li><Link to="/get-started/services">Services</Link>: plug in your router, storage and clipboard.</li>
          <li><Link to="/get-started/accessibility">Accessibility</Link>: what the kit guarantees and what you own.</li>
          <li><Link to="/foundations/color">Foundations</Link>: the tokens to use in your own CSS.</li>
        </ul>
      </Section>
    </>
  )
}

export default definePage({
  section: 'get-started',
  id: 'introduction',
  title: 'Introduction',
  order: 1,
  summary: 'Install @feeef.dev/ui, add the provider and render your first component.',
  keywords: ['install', 'setup', 'quick start', 'provider'],
  Overview,
})
