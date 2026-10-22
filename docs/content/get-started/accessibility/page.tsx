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
            ['Names', <>Fields take a <C>hint</C>, their visible floating label. <C>LabIconButton</C> requires an <C>aria-label</C>. <C>LabModal</C> requires a <C>label</C>. Kit-generated labels (close, search, theme, language) are translated.</>],
            ['Focus', <>Every focusable control shows a 2px <C>--lab-focus</C> outline on <C>:focus-visible</C>, drawn outside the painted corner and never clipped.</>],
            ['Dialogs', <>Focus is trapped while open, Escape closes, and focus returns to the opener (or to <C>returnFocusRef</C> if the opener is gone). <C>initialFocusRef</C> picks the first focused element.</>],
            ['State', <>Loading buttons set <C>aria-busy</C> and block activation; pressed toggle buttons are styled from <C>aria-pressed</C>; segmented controls use radio semantics.</>],
            ['Touch', <>On coarse pointers, buttons, icon buttons, fields, selects and menu options are at least 44px (<C>--lab-control-touch-target</C>) at any density.</>],
            ['Motion', <>Under <C>prefers-reduced-motion</C>, durations become 0ms, keyframe animations 1ms, springs jump to their target and view transitions are skipped.</>],
            ['Transparency', <>Under <C>prefers-reduced-transparency</C>, or without <C>backdrop-filter</C>, glass becomes an opaque surface.</>],
            ['Forced colors', <>In Windows high contrast, controls use system colors (<C>ButtonFace</C>, <C>Highlight</C>, <C>CanvasText</C>), glass becomes <C>Canvas</C> with a border, and decorative rims are hidden.</>],
            ['Direction', <>Layouts use logical properties and mirror under <C>dir="rtl"</C>; directional icons flip with <C>lab-dir-flip</C>; select menus inherit the trigger’s direction.</>],
            ['Zoom', 'Sizes are in CSS pixels and layouts reflow; browser zoom is never disabled.'],
          ]}
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
<LabTextField hint="Customer phone" type="tel" />

// Icon-only actions need a name that says what happens.
<LabIconButton variant="text" aria-label="Delete order">
  <Trash2 />
</LabIconButton>

// Toolbars and groups get a name too.
<LabGlassGroup role="toolbar" aria-label="Order actions">…</LabGlassGroup>`}
        />
        <Heading level={3} id="focus-return">Focus after changes</Heading>
        <p>
          When an action removes the focused element (deleting a row, closing an inline editor), move
          focus somewhere sensible. For dialogs whose trigger unmounts, pass{' '}
          <C>returnFocusRef</C>.
        </p>
        <Code
          code={`const listHeading = useRef<HTMLHeadingElement>(null)

<LabModal label="Delete order" close={close} returnFocusRef={listHeading}>
  …
</LabModal>`}
        />
        <Heading level={3} id="your-css">Your CSS</Heading>
        <Code
          lang="css"
          code={`.order-card:focus-visible {
  outline: 2px solid var(--lab-focus);
  outline-offset: 3px;
}
.order-card {
  transition: transform var(--lab-duration-normal) var(--lab-ease); /* 0ms under reduced motion */
}
@media (forced-colors: active) {
  .order-card { border: 1px solid CanvasText; }
}
@media (pointer: coarse) {
  .order-card .quick-action { min-block-size: var(--lab-control-touch-target); }
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
