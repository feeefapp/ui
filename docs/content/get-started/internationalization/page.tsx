import { ArrowRight } from 'lucide-react'
import { useI18n } from '@feeef.dev/ui/i18n'
import { UI_MESSAGES } from '@feeef.dev/ui/messages'
import { Button } from '@feeef.dev/ui/primitives/button'
import { definePage } from '../../../src/model'
import { C, Code } from '../../../src/blocks/code'
import { Callout, DoDont, Lead, Section, Table } from '../../../src/blocks/prose'
import { Link } from '../../../src/router'

const SAMPLE_KEYS = Object.keys(UI_MESSAGES.en!).filter((key) => key.startsWith('lab.common.'))

function LiveStrings() {
  const { t, locale, dir } = useI18n()
  return (
    <>
      <p>
        Active locale <C>{locale}</C>, direction <C>{dir}</C>. Change Language in Customize and this
        table, and the page direction, follow.
      </p>
      <Table
        head={['Key', 't(key, …)']}
        rows={SAMPLE_KEYS.map((key) => [
          <C>{key}</C>,
          t(key, { mode: 'dark', next: 'system', label: 'Filters', name: 'photo.png', index: 2, count: 5 }),
        ])}
      />
    </>
  )
}

function Overview() {
  const keyCount = Object.keys(UI_MESSAGES.en!).length
  return (
    <>
      <Lead>
        The host app owns the locale, direction and translations, and passes them to the kit. Kit
        widgets ship their own English, Arabic and French strings, and every layout mirrors for
        right-to-left languages.
      </Lead>

      <Section title="Pass the locale">
        <p>
          Give <C>Provider</C> an <C>i18n</C> source. Everything is optional; with nothing set the kit
          renders in Arabic, right to left.
        </p>
        <Code
          code={`<Provider
  i18n={{
    locale: 'fr',                      // active locale
    dir: 'ltr',                        // default: derived from the locale
    availableLocales: ['ar', 'fr', 'en'],
    translations: messages,            // flat { "lab.…": "ICU message" }
    url: currentUrl,                   // default: window.location
    navigate: (to) => router.visit(to) // default: the navigate service
  }}
>
  {children}
</Provider>`}
        />
        <Table
          head={['Field', 'Default', 'Meaning']}
          rows={[
            [<C>locale</C>, <C>ar</C>, 'Active locale code.'],
            [<C>dir</C>, 'from locale', <><C>rtl</C> for ar, fa, he and ur (any region), otherwise <C>ltr</C>. Written to <C>{'<html dir>'}</C>.</>],
            [<C>availableLocales</C>, 'ar, fr, en', 'What the language switcher offers.'],
            [<C>translations</C>, 'built-in strings', 'Your strings, merged over the kit’s strings for the locale.'],
            [<C>url</C>, <C>window.location</C>, 'Current path and query, used to build the language-change URL.'],
            [<C>navigate</C>, <>the <C>navigate</C> service</>, 'Opens the language-change URL.'],
          ]}
        />
        <p>
          The provider also sets <C>lang</C> and <C>dir</C> on <C>{'<html>'}</C>. Server-rendered hosts
          should render both attributes too, so the first paint has the right direction.
        </p>
      </Section>

      <Section title="Built-in strings">
        <p>
          Kit widgets read {keyCount} <C>lab.*</C> keys (close buttons, search, theme and language
          switches, loading states) from <C>UI_MESSAGES</C>, which has <C>en</C>, <C>ar</C> and{' '}
          <C>fr</C>. A locale without its own set falls back to English. Any key you pass in{' '}
          <C>translations</C> wins, so you can reword a kit string without forking it:
        </p>
        <Code
          title="locales/en.json"
          code={`{
  "lab.common.close": "Done",
  "orders.title": "Orders"
}`}
          lang="json"
        />
        <LiveStrings />
      </Section>

      <Section title="Translate your own strings">
        <p>
          <C>useI18n().t(key, params)</C> formats ICU messages with <C>intl-messageformat</C> in the
          active locale: plurals, selects, numbers and dates. Unknown keys return the key itself, and a
          malformed message returns its raw pattern instead of throwing.
        </p>
        <Code
          code={`import { useI18n } from '@feeef.dev/ui/i18n'

// translations: { "orders.count": "{count, plural, =0 {No orders} one {# order} other {# orders}}" }
function OrdersTitle({ count }: { count: number }) {
  const { t } = useI18n()
  return <h2>{t('orders.count', { count })}</h2>
}`}
        />
        <p>
          If your translations are nested JSON, flatten them with <C>flattenTranslations</C> from{' '}
          <C>@feeef.dev/ui/i18n-core</C> (<C>{'{voice:{title}}'}</C> → <C>lab.voice.title</C>). The same
          module has <C>translateLab</C> and <C>formatMessage</C>, pure functions for tests and server
          code.
        </p>
      </Section>

      <Section title="Switching language">
        <p>
          <C>LanguageSwitcher</C> lists the built-in languages that are in <C>availableLocales</C> and
          hides itself when fewer than two are available. Pass <C>iconOnly</C> for a globe button with a
          menu, the form used in toolbars and sidebars.
        </p>
        <Code
          code={`import { LanguageSwitcher } from '@feeef.dev/ui/i18n'

<LanguageSwitcher iconOnly />`}
        />
        <p>
          Choosing a language calls <C>setLocale</C>, which does not change state in the browser. It
          builds the current URL with <C>?hl=&lt;code&gt;</C> (<C>localeUrl</C>) and calls{' '}
          <C>navigate</C>. The server reads <C>hl</C>, stores the choice (usually a cookie) and renders
          the page in the new locale with its translations.
        </p>
        <Code
          code={`import { localeUrl } from '@feeef.dev/ui/i18n'

localeUrl('/orders?page=2#top', 'ar') // → '/orders?page=2&hl=ar#top'`}
        />
        <Callout title="Inertia and Next.js">
          <p>
            In Inertia, pass <C>{'navigate: (url) => router.visit(url, { preserveScroll: true })'}</C>{' '}
            so the switch reloads props without a full page load. In Next.js, use{' '}
            <C>router.push</C> and resolve <C>hl</C> in middleware.
          </p>
        </Callout>
      </Section>

      <Section title="Right-to-left layout">
        <p>
          Kit CSS uses logical properties (<C>inset-inline-start</C>, <C>padding-inline</C>,{' '}
          <C>margin-block</C>), so layouts mirror from <C>dir</C> alone. Write yours the same way:
        </p>
        <Code
          lang="css"
          code={`.order-row {
  padding-inline: var(--lab-space-4) var(--lab-space-2); /* start, end */
  border-inline-start: 3px solid var(--lab-primary);
  text-align: start;
}
.order-row .chevron {
  margin-inline-start: auto;
}`}
        />
        <p>
          Icons that point along the reading direction (back and forward arrows, disclosure chevrons,
          panel open and close) must flip too. Add the kit’s <C>lab-dir-flip</C> class; under{' '}
          <C>{"[dir='rtl']"}</C> it mirrors the icon.
        </p>
        <div className="docs-stage">
          <Button variant="tonal">
            Continue <ArrowRight className="lab-dir-flip" />
          </Button>
        </div>
        <Code code={`<Button variant="tonal">\n  Continue <ArrowRight className="lab-dir-flip" />\n</Button>`} />
        <DoDont
          doItems={[
            <>Use <C>start</C>/<C>end</C> and <C>inline</C>/<C>block</C> properties.</>,
            <>Flip directional icons with <C>lab-dir-flip</C>.</>,
            'Check every screen in Arabic: try it in Customize.',
          ]}
          dontItems={[
            <>Write <C>left</C>, <C>right</C>, <C>margin-left</C> or <C>text-align: left</C>.</>,
            'Flip icons that are not directional, such as play, search or a check mark.',
            'Concatenate translated fragments; use one ICU message with parameters.',
          ]}
        />
        <p>
          Accessibility notes for RTL are on <Link to="/get-started/accessibility">Accessibility</Link>.
        </p>
      </Section>
    </>
  )
}

export default definePage({
  section: 'get-started',
  id: 'internationalization',
  title: 'Languages and RTL',
  order: 3,
  summary: 'Pass the locale and translations, use the built-in en/ar/fr strings, and build layouts that mirror for Arabic.',
  keywords: ['i18n', 'internationalization', 'translation', 'locale', 'arabic', 'french', 'rtl', 'direction', 'ICU', 'useI18n', 'LanguageSwitcher'],
  Overview,
})
