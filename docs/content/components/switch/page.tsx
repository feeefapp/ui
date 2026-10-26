import { SlideSwitch } from '@feeef.dev/ui/primitives/slider'
import { definePage, examplesFrom } from '../../../src/model'
import { Playground, jsx } from '../../../src/blocks/playground'
import { Callout, DoDont, Keys, Section } from '../../../src/blocks/prose'
import { C } from '../../../src/blocks/code'

const controls = {
  trackStyle: { type: 'select', options: ['thick', 'thin'], default: 'thick' },
  onText: { type: 'text', label: 'On text', default: '' },
  offText: { type: 'text', label: 'Off text', default: '' },
  loading: { type: 'boolean', default: false },
  disabled: { type: 'boolean', default: false },
} as const

function Overview() {
  return (
    <>
      <Playground
        controls={controls}
        render={(v) => (
          <div className="demo-row">
            <span aria-hidden="true">Cash on delivery</span>
            <SlideSwitch
              label="Cash on delivery"
              defaultChecked
              trackStyle={v.trackStyle as 'thick' | 'thin'}
              onText={v.onText || undefined}
              offText={v.offText || undefined}
              loading={v.loading}
              disabled={v.disabled}
            />
          </div>
        )}
        code={(v) =>
          jsx(
            'SlideSwitch',
            {
              label: 'Cash on delivery',
              checked: '__CHECKED__',
              onCheckedChange: '__SET__',
              trackStyle: v.trackStyle,
              onText: v.onText || undefined,
              offText: v.offText || undefined,
              loading: v.loading,
              disabled: v.disabled,
            },
            undefined,
            { trackStyle: 'thick' }
          )
            .replace('checked="__CHECKED__"', 'checked={codEnabled}')
            .replace('onCheckedChange="__SET__"', 'onCheckedChange={setCodEnabled}')
        }
      />

      <Section title="When to use">
        <p>
          Use a switch for a setting that takes effect immediately: turning a payment method on,
          enabling a pixel, pausing a product. The change applies as soon as it is flipped, with no
          Save button. When the choice is part of a form that is submitted later, or when it needs a
          longer explanation, use a checkbox.
        </p>
        <p>
          <C>SlideSwitch</C> shares the slider’s track, thumb and spring. A tap toggles it. The thumb
          can also be dragged: it follows the finger, rubber-bands a little past either end and on
          release settles on the side its momentum carries it to, so a flick toggles and a careful drop
          stays where it is.
        </p>
        <p>
          Pressed or dragged, the thumb turns into a glass lens measured from iOS 26.2’s: it grows to
          1.54× (<C>LENS_THUMB_SCALE</C>, 37 × 24 → 57 × 37), stretches along a quick drag and springs
          back on release. It is not the slider’s lens: like iOS’s it bends outward along its rim, zooms its
          middle out a little and has a dark line along its top and bottom edges. Reduced motion keeps the solid thumb
          with no swell or stretch; reduced transparency, more contrast and the <C>solid</C> glass style keep a
          solid thumb that still grows. On touch screens the switch keeps its 63 × 28px look and its hit
          area reaches 44px tall.
        </p>
      </Section>

      <Section title="State and callbacks">
        <p>
          Use <C>checked</C> with <C>onCheckedChange</C> for a controlled switch, or{' '}
          <C>defaultChecked</C> for an uncontrolled one. <C>onCheckedChange</C> also fires mid-drag
          when the thumb crosses the middle, so the label can follow it.{' '}
          <C>onCheckedCommit</C> fires once when the person settles: a tap, a key press or the end of
          a drag. Save there.
        </p>
        <p>
          While the change is saving, set <C>loading</C>: the switch shows the new state, ignores
          input and reports <C>aria-busy</C>. If the save fails, set <C>checked</C> back and say why.
        </p>
      </Section>

      <Section title="Size, track and text">
        <p>
          A switch has one size, iOS's: a 63 × 28px track with a 37 × 24px thumb at comfortable
          density, one step smaller in compact and thin. Change it app-wide with{' '}
          <C>ThemeConfig.metrics.switchSize</C> and <C>thumbSize</C>, never per switch.{' '}
          <C>trackStyle</C> works as on the slider. <C>onText</C> and{' '}
          <C>offText</C> print a short word on the track, such as “On” and “Off”. They are visual
          only; the state is already announced, so keep them to a word or two.
        </p>
      </Section>

      <Section title="Switches in menus">
        <p>
          A menu item or list row that already toggles a setting, such as a{' '}
          <C>menuitemcheckbox</C>, must not contain a second interactive switch. Draw{' '}
          <C>SlideSwitchIndicator</C> inside it instead: the same picture and spring, with no role,
          no focus and <C>aria-hidden</C>. The row carries <C>aria-checked</C> and handles the click.
        </p>
      </Section>

      <Section title="Guidelines">
        <DoDont
          doItems={[
            'Label the setting, not the action: “Cash on delivery”, not “Enable cash on delivery”.',
            'Apply the change immediately and show loading while it saves.',
            'Put the visible label before the switch in the reading direction.',
            'Explain consequences next to it when the setting affects customers.',
          ]}
          dontItems={[
            'Use a switch inside a form that needs a Save button; use a checkbox.',
            'Ask for confirmation after every flip; confirm only destructive settings.',
            'Change the label text to describe the state (“On” / “Off”).',
            'Nest a SlideSwitch inside a clickable row or menu item.',
          ]}
        />
      </Section>

      <Section title="Accessibility">
        <p>
          The switch is one focusable element with <C>role="switch"</C> and <C>aria-checked</C>.{' '}
          <C>label</C> is required and becomes its <C>aria-label</C>; it is not drawn, so show the
          same text next to the switch. Assistive technology that activates with a synthetic click
          toggles it too. A disabled or loading switch leaves the tab order. In right-to-left layouts
          the track mirrors.
        </p>
        <Keys
          rows={[
            ['Space', 'Toggles the switch.'],
            ['Enter', 'Toggles the switch.'],
            ['Arrow Right', 'Turns it on (off in right-to-left).'],
            ['Arrow Left', 'Turns it off (on in right-to-left).'],
            ['Home', 'Turns it off.'],
            ['End', 'Turns it on.'],
            ['Escape', 'Cancels a drag in progress.'],
          ]}
        />
        <Callout title="Visible label">
          <p>
            Hide the visible text from assistive technology with <C>aria-hidden</C> (as in the
            examples) or point at it with <C>aria-labelledby</C>, so the name is not read twice.
          </p>
        </Callout>
      </Section>
    </>
  )
}

export default definePage({
  section: 'components',
  id: 'switch',
  title: 'Switch',
  group: 'Inputs',
  order: 4,
  summary: 'Switches turn a setting on or off immediately. They can be tapped or dragged and show a saving state.',
  importLine: "import { SlideSwitch, SlideSwitchIndicator } from '@feeef.dev/ui/primitives/slider'",
  source: 'src/primitives/slider.tsx',
  api: ['SlideSwitch', 'SlideSwitchIndicator'],
  keywords: ['toggle', 'on off', 'setting', 'slide switch', 'indicator', 'menu'],
  Overview,
  examples: examplesFrom(
    import.meta.glob('./examples/*.tsx', { eager: true }),
    import.meta.glob('./examples/*.tsx', { eager: true, query: '?raw', import: 'default' }),
    import.meta.glob('./examples/*.dart', { eager: true, query: '?raw', import: 'default' })
  ),
  Preview: () => (
    <>
      <SlideSwitch label="Preview on" defaultChecked />
      <SlideSwitch label="Preview off" />
    </>
  ),
})
