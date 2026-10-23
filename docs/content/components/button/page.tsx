import { Plus } from 'lucide-react'
import { Button } from '@feeef.dev/ui/primitives/button'
import { definePage, examplesFrom } from '../../../src/model'
import { Playground, jsx } from '../../../src/blocks/playground'
import { Callout, DoDont, Keys, Section, Table } from '../../../src/blocks/prose'
import { C } from '../../../src/blocks/code'

const VARIANTS = ['filled', 'tonal', 'elevated', 'outlined', 'text', 'ghost', 'destructive'] as const

const controls = {
  label: { type: 'text', default: 'Save changes' },
  variant: { type: 'select', options: VARIANTS, default: 'filled' },
  controlSize: { type: 'select', options: ['small', 'regular', 'large', 'inline'], default: 'regular' },
  icon: { type: 'boolean', label: 'Leading icon', default: false },
  loading: { type: 'boolean', default: false },
  disabled: { type: 'boolean', default: false },
} as const

function Overview() {
  return (
    <>
      <Playground
        controls={controls}
        render={(v) => (
          <Button
            variant={v.variant as (typeof VARIANTS)[number]}
            controlSize={v.controlSize as 'small' | 'regular' | 'large' | 'inline'}
            loading={v.loading}
            disabled={v.disabled}
          >
            {v.icon && <Plus size={18} />}
            {v.label}
          </Button>
        )}
        code={(v) =>
          jsx(
            'Button',
            { variant: v.variant, controlSize: v.controlSize, loading: v.loading, disabled: v.disabled },
            v.icon ? `<Plus size={18} />\n${v.label}` : v.label,
            { controlSize: 'regular' }
          )
        }
      />

      <Section title="Choosing a variant">
        <p>
          Every button names its emphasis with <C>variant</C>. Always set it: a button without a variant
          gets no paint at all, and emphasis should be a decision, not an accident.
        </p>
        <Table
          head={['Variant', 'Use it for']}
          rows={[
            [<C>filled</C>, 'The one completing action on a surface: Save, Create, Pay. Usually one per view.'],
            [<C>tonal</C>, 'A supporting action that still deserves weight, next to a filled one.'],
            [<C>elevated</C>, 'Actions that must stand apart from a busy background, such as cards or media.'],
            [<C>outlined</C>, 'A secondary action that should read as clearly clickable.'],
            [<C>text</C>, 'Low-emphasis commands: Cancel, Learn more, inline actions.'],
            [<C>ghost</C>, 'Quiet chrome: navigation, menus, actions that appear on hover or in dense lists.'],
            [<C>destructive</C>, 'Deleting or discarding something. Pair it with a confirmation.'],
          ]}
        />
      </Section>

      <Section title="Sizes">
        <p>
          <C>controlSize</C> sets the height, iOS's three: <C>small</C> 30px, <C>regular</C> 36px and{' '}
          <C>large</C> 52px, with 10 / 12 / 20px side padding and 15 / 17 / 17px labels. Every button is a
          capsule (radius half its height) drawn with the kit's superellipse corners. <C>inline</C> fits a
          button into running text. Inside a toolbar group or a dock, keep the default size: the host sets
          it. Under <C>density="compact"</C> the whole app steps one size down without touching each
          button, and <C>ThemeConfig.metrics.controlHeight</C> changes the sizes themselves. On touch
          screens every size keeps its look (a 36px button stays 36px on a phone) and gains an invisible
          hit area of at least 44 × 44px around it, without moving anything.
        </p>
        <p>
          A press answers like iOS. Toolbar (glass) buttons swell by 1.06 and show the glass touch glow
          under the finger; filled, tonal, elevated, outlined and destructive buttons grow a little
          (1.03), no glow; both spring back. Inside a glass bubble the bubble answers instead (it swells
          and glows as a whole), so nothing doubles up. The <C>:active</C> fills stay. Reduced motion
          turns the movement off; still and solid glass have no glass press.
        </p>
      </Section>

      <Section title="Guidelines">
        <DoDont
          doItems={[
            'Use a verb that says what happens: “Save changes”, “Create order”.',
            'Keep one filled button per view, at the end of the reading direction.',
            <>Use <C>loading</C> while a request runs instead of disabling and re-enabling.</>,
            <>Use <C>asChild</C> with your router’s link when the button navigates.</>,
          ]}
          dontItems={[
            'Put two filled buttons side by side; make the second one tonal or text.',
            'Use an icon-only button without an aria-label (IconButton requires one).',
            'Style a button with your own classes; pick a variant and size instead.',
            'Nest interactive elements inside a button.',
          ]}
        />
      </Section>

      <Section title="Accessibility">
        <p>
          <C>Button</C> renders a native <C>{'<button type="button">'}</C>, so it keeps form semantics
          and keyboard behavior. <C>loading</C> sets <C>aria-busy</C>; <C>disabled</C> and <C>loading</C>{' '}
          both set <C>aria-disabled</C> and swallow clicks, keys and middle-clicks, including on an{' '}
          <C>asChild</C> link. A toggle button should set <C>aria-pressed</C>, which also paints its
          selected state.
        </p>
        <Keys
          rows={[
            ['Enter', 'Activates the button.'],
            ['Space', 'Activates the button.'],
            ['Tab', 'Moves focus to the next control. Disabled buttons stay focusable only as links.'],
          ]}
        />
        <Callout title="Icon-only buttons">
          <p>
            <C>IconButton</C> makes <C>aria-label</C> a required prop. Use a short noun or verb, like
            “Settings” or “Delete order”.
          </p>
        </Callout>
      </Section>
    </>
  )
}

export default definePage({
  section: 'components',
  id: 'button',
  title: 'Button',
  group: 'Actions',
  order: 1,
  summary: 'Buttons start actions. Seven variants express emphasis; three sizes fit forms, toolbars and text.',
  importLine: "import { Button, IconButton } from '@feeef.dev/ui/primitives/button'",
  source: 'src/primitives/button.tsx',
  api: ['Button', 'IconButton'],
  keywords: ['icon button', 'link', 'cta', 'submit', 'loading'],
  Overview,
  examples: examplesFrom(
    import.meta.glob('./examples/*.tsx', { eager: true }),
    import.meta.glob('./examples/*.tsx', { eager: true, query: '?raw', import: 'default' }),
    import.meta.glob('./examples/*.dart', { eager: true, query: '?raw', import: 'default' })
  ),
  Preview: () => (
    <>
      <Button variant="filled">Save</Button>
      <Button variant="text">Cancel</Button>
    </>
  ),
})
