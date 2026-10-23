import { Slider } from '@feeef.dev/ui/primitives/slider'
import { definePage, examplesFrom } from '../../../src/model'
import { Playground, jsx } from '../../../src/blocks/playground'
import { Callout, DoDont, Keys, Section, Table } from '../../../src/blocks/prose'
import { C } from '../../../src/blocks/code'

const controls = {
  min: { type: 'number', min: 0, max: 50, step: 5, default: 0 },
  max: { type: 'number', min: 60, max: 200, step: 10, default: 100 },
  step: { type: 'number', min: 1, max: 20, default: 5 },
  trackStyle: { type: 'select', options: ['thick', 'thin'], default: 'thick' },
  controlSize: { type: 'select', options: ['small', 'regular'], default: 'regular' },
  showStops: { type: 'boolean', label: 'Show stops', default: false },
  disabled: { type: 'boolean', default: false },
} as const

function Overview() {
  return (
    <>
      <Playground
        controls={controls}
        render={(v) => (
          <div className="demo-wide">
            <Slider
              label="Discount"
              min={v.min}
              max={v.max}
              step={v.step}
              defaultValue={Math.round((v.min + v.max) / 2 / v.step) * v.step}
              trackStyle={v.trackStyle as 'thick' | 'thin'}
              controlSize={v.controlSize as 'small' | 'regular'}
              showStops={v.showStops}
              disabled={v.disabled}
              getValueText={(value) => `${value}%`}
            />
          </div>
        )}
        code={(v) =>
          jsx(
            'Slider',
            {
              label: 'Discount',
              min: v.min,
              max: v.max,
              step: v.step,
              trackStyle: v.trackStyle,
              controlSize: v.controlSize,
              showStops: v.showStops,
              disabled: v.disabled,
              value: '__VALUE__',
              onValueChange: '__SET__',
            },
            undefined,
            { min: 0, max: 100, step: 1, trackStyle: 'thick', controlSize: 'regular' }
          )
            .replace('value="__VALUE__"', 'value={discount}')
            .replace('onValueChange="__SET__"', 'onValueChange={setDiscount}')
        }
      />

      <Section title="When to use">
        <p>
          Use a slider when the exact number matters less than its position in a range, and the
          person benefits from seeing the effect as they drag: a discount, a volume, a quality
          level, an image strength. When people know the exact number they want, such as a price
          or a quantity, use a number field (it scrubs and accepts typed values); a slider can be paired with one.
        </p>
      </Section>

      <Section title="Value and range">
        <p>
          <C>min</C>, <C>max</C> and <C>step</C> default to 0, 100 and 1. Every value is snapped to the
          step grid and clamped to the range. Use <C>value</C> with <C>onValueChange</C> for a
          controlled slider, or <C>defaultValue</C> (which falls back to <C>min</C>) for an
          uncontrolled one. Give it a <C>name</C> to submit the value with a form through a hidden
          input; a form reset returns an uncontrolled slider to its default.
        </p>
        <Table
          head={['Callback', 'Fires', 'Use it for']}
          rows={[
            [<C>onValueChange</C>, 'On every change while dragging and on every key press', 'Updating a preview or a label as the thumb moves.'],
            [<C>onValueCommit</C>, 'Once the user settles: pointer release, or each key press', 'Saving, filtering or starting a request.'],
          ]}
        />
        <p>
          Pressing Escape during a drag cancels it and returns to the value from before the drag.
        </p>
      </Section>

      <Section title="Stops, marks and track style">
        <p>
          <C>showStops</C> draws a dot on every step, for ranges with few steps (it draws nothing past
          101). <C>marks</C> places dots at chosen values instead, and prints the <C>label</C> of each
          mark under the track: use it for named levels such as “Draft”, “Standard”, “Best”.
        </p>
        <p>
          <C>trackStyle="thick"</C>, the default, makes the whole track a touch surface as tall as a
          regular control (36px) with the thumb inside it; <C>controlSize="small"</C> makes it 30px.{' '}
          <C>thin</C> is the iOS slider: a 6px rail with a 37 × 24px capsule thumb, for settings panels
          and dense layouts. Both follow density and <C>ThemeConfig.metrics</C> (<C>sliderTrack</C>,{' '}
          <C>thumbSize</C>).
        </p>
      </Section>

      <Section title="Custom decoration">
        <p>
          Three slots render inside the slider and receive its state (<C>value</C>, a smooth{' '}
          <C>position</C>, <C>fraction</C> from 0 to 1, <C>dragging</C> and <C>disabled</C>) on every
          frame: <C>renderTrack</C> behind the rail (a waveform, a gradient), <C>renderFill</C> inside
          the filled part, and <C>renderThumb</C> inside the thumb (an icon or the value). They are
          decoration only and hidden from assistive technology; the slider keeps its own geometry,
          pointer handling and spring.
        </p>
      </Section>

      <Section title="Guidelines">
        <DoDont
          doItems={[
            'Show the current value next to the slider, formatted the way people read it.',
            <>Pass <C>getValueText</C> so screen readers announce “15%” or “1,200 DZD”, not a bare number.</>,
            <>Save on <C>onValueCommit</C>, not on every <C>onValueChange</C>.</>,
            'Pick a step that matches real choices: 5% for discounts, 1 for star ratings.',
          ]}
          dontItems={[
            'Use a slider for precise values like prices or phone numbers.',
            'Hide the minimum and maximum when they are not obvious; label them with marks.',
            'Use showStops on long ranges; the dots blur into a line.',
            'Put interactive content in the render slots.',
          ]}
        />
      </Section>

      <Section title="Accessibility">
        <p>
          The slider is one focusable element with <C>role="slider"</C>, <C>aria-valuemin</C>,{' '}
          <C>aria-valuemax</C>, <C>aria-valuenow</C> and <C>aria-valuetext</C> from{' '}
          <C>getValueText</C>. <C>label</C> is required and becomes its <C>aria-label</C>; it is not
          drawn, so show a visible label next to the slider too. In right-to-left layouts the track
          and the arrow keys mirror. A disabled slider leaves the tab order.
        </p>
        <Keys
          rows={[
            ['Arrow Right', 'Increases by one step (decreases in right-to-left).'],
            ['Arrow Left', 'Decreases by one step (increases in right-to-left).'],
            ['Arrow Up', 'Increases by one step.'],
            ['Arrow Down', 'Decreases by one step.'],
            ['Page Up', 'Increases by ten steps.'],
            ['Page Down', 'Decreases by ten steps.'],
            ['Home', 'Moves to the minimum.'],
            ['End', 'Moves to the maximum.'],
            ['Escape', 'Cancels a drag in progress.'],
          ]}
        />
        <Callout title="Every key press commits">
          <p>
            Keyboard changes call both <C>onValueChange</C> and <C>onValueCommit</C>. If committing
            starts a request, debounce it so holding an arrow key does not send dozens.
          </p>
        </Callout>
      </Section>
    </>
  )
}

export default definePage({
  section: 'components',
  id: 'slider',
  title: 'Slider',
  group: 'Inputs',
  order: 3,
  summary: 'Sliders pick a value from a range by dragging or with the keyboard, with optional stops, marks and custom decoration.',
  importLine: "import { Slider } from '@feeef.dev/ui/primitives/slider'",
  source: 'src/primitives/slider.tsx',
  api: ['Slider'],
  keywords: ['range', 'track', 'thumb', 'marks', 'stops', 'volume'],
  Overview,
  examples: examplesFrom(
    import.meta.glob('./examples/*.tsx', { eager: true }),
    import.meta.glob('./examples/*.tsx', { eager: true, query: '?raw', import: 'default' }),
    import.meta.glob('./examples/*.dart', { eager: true, query: '?raw', import: 'default' })
  ),
  Preview: () => (
    <div style={{ width: 220 }}>
      <Slider label="Discount" defaultValue={40} />
    </div>
  ),
})
