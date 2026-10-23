import { definePage } from '../../../src/model'
import { C, Code } from '../../../src/blocks/code'
import { Callout, DoDont, Heading, Keys, Lead, Section, Table } from '../../../src/blocks/prose'
import { Link } from '../../../src/router'

function Overview() {
  return (
    <>
      <Lead>
        The kit handles the parts of accessibility that belong to a component: semantics, focus,
        keyboard behavior, motion and contrast fallbacks. Your part is good labels, logical order and
        testing your screens.
      </Lead>

      <Section title="What the kit commits to">
        <Table
          head={['Area', 'Commitment']}
          rows={[
            ['Native elements', <>Buttons are <C>{'<button>'}</C>, checkboxes and radios are native inputs, dialogs are the native <C>{'<dialog>'}</C>. Browser keyboard behavior, form submission and validity come for free.</>],
            ['Names', <>Fields take a <C>hint</C>, their visible floating label. <C>IconButton</C> requires an <C>aria-label</C>. <C>Modal</C> requires a <C>label</C>. Kit-generated labels (close, search, theme, language) are translated.</>],
            ['Focus', <>Keyboard focus (<C>:focus-visible</C>; in Flutter, traditional highlight mode) shows a thin ring that hugs the control, 2px at 1px out, in the focus color at reduced strength, plus the control’s hover fill. Fields show it on their own edge instead. Pointer and touch focus show nothing. Increased contrast and forced colors get a strong 3px ring. See <a href="#focus">Focus</a>.</>],
            ['Dialogs', <>Focus is trapped while open, Escape closes, and focus returns to the opener (or to <C>returnFocusRef</C> if the opener is gone). <C>initialFocusRef</C> picks the first focused element.</>],
            ['State', <>Loading buttons set <C>aria-busy</C> and block activation; pressed toggle buttons are styled from <C>aria-pressed</C>; segmented controls use radio semantics.</>],
            ['Touch', <>On coarse pointers, buttons, icon buttons, chips, switches, segmented options, checkboxes and radios keep their size and gain an invisible hit area of at least 44 × 44px (<C>--lab-control-touch-target</C>; Flutter <C>TouchTarget</C>) without changing layout; fields, selects and menu rows are at least 44px tall. At any density.</>],
            ['Motion', <>Under <C>prefers-reduced-motion</C>, durations become 0ms, keyframe animations 1ms, springs jump to their target and view transitions are skipped. Apps can ask for the same with ThemeConfig <C>motion: 'reduced'</C>, or stop every animation, ambient ones and the reduced crossfades included, with <C>motion: 'none'</C> (<C>motionFade()</C> gives a crossfade its length); the reader's setting still wins when stricter (<C>motionOf()</C>, Flutter <C>motionOf(context)</C>).</>],
            ['Transparency', <>Under <C>prefers-reduced-transparency</C>, or without <C>backdrop-filter</C>, glass becomes an opaque surface.</>],
            ['Forced colors', <>In Windows high contrast, controls use system colors (<C>ButtonFace</C>, <C>Highlight</C>, <C>CanvasText</C>), glass becomes <C>Canvas</C> with a border, and decorative rims are hidden.</>],
            ['Direction', <>Layouts use logical properties and mirror under <C>dir="rtl"</C>; directional icons flip with <C>lab-dir-flip</C>; select menus inherit the trigger’s direction.</>],
            ['Zoom', 'Sizes are in CSS pixels and layouts reflow; browser zoom is never disabled.'],
          ]}
        />
      </Section>

      <Section title="Focus">
        <p>
          Focus looks like iOS's keyboard focus: a highlight that hugs the element, never a ring floating
          a few pixels outside it. It only appears for keyboard focus; a click or a tap shows nothing.
        </p>
        <Table
          head={['What', 'Keyboard focus shows']}
          rows={[
            ['Buttons, icon buttons, segments, tabs, chips, list rows, sliders, switches', <>A <C>--lab-focus-ring-width</C> (2px) line in <C>--lab-focus-ring-color</C> (the focus color at 65%) <C>--lab-focus-ring-offset</C> (1px) outside the shape, following its corners, plus the hover fill. Rows, tabs and other edge-to-edge items draw it just inside.</>],
            ['Text fields, selects, number fields while typing, composers', 'No ring outside. The field’s own edge turns the focus color and thickens inward to the ring width; the floating hint takes the focus color.'],
            ['Increased contrast, forced colors', <>A strong ring: 3px, 2px out, the full focus color (<C>Highlight</C> in forced colors). It wins over the app’s <C>metrics</C>.</>],
            ['Scrolled-to elements', <><C>ScrollArea</C> sets <C>scroll-padding</C> to the space its floating bars (and a tab bar) reserve, so a focused element never lands under them.</>],
          ]}
        />
        <p>
          The three tokens restyle it app-wide: set <C>metrics.focusRingWidth</C> and{' '}
          <C>focusRingOffset</C> in the theme config, or override <C>--lab-focus-ring-color</C>. In
          Flutter, <C>FocusRingStyle.of(context)</C> resolves the same values (and the high-contrast ring)
          for custom widgets, and <C>FocusRing</C> paints it.
        </p>
        <Code
          lang="dart"
          title="Flutter"
          code={`FocusableActionDetector(
  onShowFocusHighlight: (visible) => setState(() => _focused = visible),
  child: FocusRing(visible: _focused, radius: 12, child: card),
)`}
        />
      </Section>

      <Section title="Keyboard">
        <p>Kit controls follow platform conventions:</p>
        <Keys
          rows={[
            ['Tab', 'Move to the next control. Shift + Tab moves back.'],
            ['Enter', 'Activate a button or link; submit a single-line field’s form.'],
            ['Space', 'Activate a button, toggle a checkbox or switch.'],
            ['Arrow keys', 'Move within radio groups, segmented controls, sliders and menus.'],
            ['Home', 'First option or minimum value, where it applies.'],
            ['End', 'Last option or maximum value, where it applies.'],
            ['Escape', 'Close a dialog, menu or popover and return focus.'],
          ]}
        />
        <p>Each component page lists its exact keys in its Accessibility section.</p>
      </Section>

      <Section title="Your part">
        <Heading level={3} id="labels">Labels</Heading>
        <Code
          code={`// A field's hint is its label: always set it.
<TextField hint="Customer phone" type="tel" />

// Icon-only actions need a name that says what happens.
<IconButton variant="text" aria-label="Delete order">
  <Trash2 />
</IconButton>

// Toolbars and groups get a name too.
<GlassGroup role="toolbar" aria-label="Order actions">…</GlassGroup>`}
        />
        <Heading level={3} id="focus-return">Focus after changes</Heading>
        <p>
          When an action removes the focused element (deleting a row, closing an inline editor), move
          focus somewhere sensible. For dialogs whose trigger unmounts, pass{' '}
          <C>returnFocusRef</C>.
        </p>
        <Code
          code={`const listHeading = useRef<HTMLHeadingElement>(null)

<Modal label="Delete order" close={close} returnFocusRef={listHeading}>
  …
</Modal>`}
        />
        <Heading level={3} id="your-css">Your CSS</Heading>
        <Code
          lang="css"
          code={`.order-card:focus-visible {
  outline: var(--lab-focus-ring-width) solid var(--lab-focus-ring-color);
  outline-offset: var(--lab-focus-ring-offset);
  background: var(--lab-control-hover);
}
.order-card {
  transition: transform var(--lab-duration-normal) var(--lab-ease); /* 0ms under reduced motion */
}
@media (forced-colors: active) {
  .order-card { border: 1px solid CanvasText; }
}
@media (pointer: coarse) {
  /* Keep the look; reach 44px (the kit's buttons do this already). */
  .order-card .quick-action { position: relative; }
  .order-card .quick-action::before {
    content: ''; position: absolute; left: 50%; top: 50%; translate: -50% -50%;
    width: max(100%, var(--lab-control-touch-target));
    height: max(100%, var(--lab-control-touch-target));
  }
}`}
        />
        <Callout title="Color is never the only signal">
          <p>
            Pair status colors with text or an icon, and keep text on opaque surfaces. See{' '}
            <Link to="/foundations/color">Color</Link> and <Link to="/foundations/materials">Materials</Link>.
          </p>
        </Callout>
      </Section>

      <Section title="Checklist">
        <DoDont
          doTitle="Test"
          dontTitle="Avoid"
          doItems={[
            'Every task with the keyboard alone.',
            'Light and dark mode, both palettes, compact density (Customize).',
            'Arabic, right to left.',
            '200% browser zoom and a 360px-wide screen.',
            'Reduced motion and reduced transparency turned on.',
            'A screen reader pass on new flows.',
          ]}
          dontItems={[
            'Removing focus outlines or disabling zoom.',
            'Placeholders as the only label.',
            'Hit areas smaller than 44px on touch screens.',
            'Information that only appears during an animation or on hover.',
            'Clipping a control to fake a shape; it cuts off the focus ring.',
            'A focus ring floating a few pixels outside a control; use the focus tokens so it hugs the shape.',
          ]}
        />
      </Section>
    </>
  )
}

export default definePage({
  section: 'get-started',
  id: 'accessibility',
  title: 'Accessibility',
  order: 5,
  summary: 'What the kit guarantees for keyboard, focus, motion, contrast, touch and RTL, and what your app still owns.',
  keywords: ['a11y', 'accessibility', 'keyboard', 'focus', 'screen reader', 'reduced motion', 'forced colors', 'high contrast', 'touch target', 'rtl'],
  Overview,
})
