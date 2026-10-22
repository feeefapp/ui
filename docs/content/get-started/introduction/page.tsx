import { definePage } from '../../../src/model'
import { C, Code } from '../../../src/blocks/code'
import { Callout, Section, Table } from '../../../src/blocks/prose'
import { Link } from '../../../src/router'
import { useDocsSettings } from '../../../src/settings'
import pkg from '../../../../package.json'

/** The same three steps for the Flutter twin (the platform switch at the top picks). */
function FlutterSteps() {
  return (
    <>
      <Section title="Install">
        <p>
          The Flutter package lives in the same repository, in <C>flutter/</C>. Pin the same tag as the
          web kit; it needs only Flutter’s own <C>widgets</C> library.
        </p>
        <Code
          lang="yaml"
          title="pubspec.yaml"
          code={`dependencies:
  feeef_ui:
    git:
      url: git@github.com:feeefapp/ui.git
      path: flutter
      ref: v${pkg.version}`}
        />
      </Section>

      <Section title="Add the providers">
        <p>
          <C>I18nProvider</C> carries the locale and the kit’s strings (and with them the direction);{' '}
          <C>ThemeProvider</C> carries the same theme config as the React <C>Provider</C>.
        </p>
        <Code
          lang="dart"
          code={`import 'package:feeef_ui/feeef_ui.dart' as ui;
import 'package:flutter/widgets.dart';

Widget root(Widget app) => ui.I18nProvider(
  locale: 'en',
  child: ui.ThemeProvider(
    config: const ui.ThemeConfig(palette: .lab, density: .comfortable, radius: 1),
    child: app,
  ),
);`}
        />
      </Section>

      <Section title="Use a component">
        <p>
          Everything is exported from one library. Labels and icons are widgets, like children in React.
          See <Link to="/get-started/flutter">Flutter</Link> for how the React props map.
        </p>
        <Code
          lang="dart"
          code={`class Signup extends StatelessWidget {
  const Signup({super.key, required this.create});
  final void Function(Map<String, String> values) create;

  @override
  Widget build(BuildContext context) => ui.FieldForm(
    onSubmit: create,
    child: Builder(
      builder: (context) => Column(
        spacing: 16,
        children: [
          const ui.TextField(name: 'email', hint: 'Email', keyboardType: TextInputType.emailAddress, required: true),
          ui.Button(
            variant: .filled,
            onClick: () => ui.FieldForm.of(context).submit(),
            children: const [Text('Create account')],
          ),
        ],
      ),
    ),
  );
}`}
        />
      </Section>
    </>
  )
}

function Overview() {
  const { settings } = useDocsSettings()
  return (
    <>
      {settings.code === 'flutter' ? <FlutterSteps /> : <ReactSteps />}
      <Rest />
    </>
  )
}

function ReactSteps() {
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
          Wrap your app once in <C>Provider</C>. It installs services, translations, the theme and
          the floating-layer system that docks, dialogs and menus use.
        </p>
        <Code
          code={`import { Provider } from '@feeef.dev/ui/provider'

export function Root({ children }: { children: React.ReactNode }) {
  return (
    <Provider
      theme={{ palette: 'lab', density: 'comfortable', radius: 1 }}
      i18n={{ locale: 'en' }}
    >
      {children}
    </Provider>
  )
}`}
        />
        <Callout title="Server rendering">
          <p>
            In Next.js or any SSR host, spread <C>themeAttributes(theme)</C> onto <C>{'<html>'}</C> so
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
          code={`import { Button } from '@feeef.dev/ui/primitives/button'
import { TextField } from '@feeef.dev/ui/primitives/text-field'

export function Signup() {
  return (
    <form>
      <TextField hint="Email" type="email" required />
      <Button variant="filled" type="submit">Create account</Button>
    </form>
  )
}`}
        />
      </Section>

    </>
  )
}

function Rest() {
  return (
    <>
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
  summary: 'Install the kit (React or Flutter), add the provider and render your first component.',
  keywords: ['install', 'setup', 'quick start', 'provider'],
  Overview,
})
