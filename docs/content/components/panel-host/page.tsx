import { definePage, examplesFrom } from '../../../src/model'
import { DoDont, Section } from '../../../src/blocks/prose'
import { C } from '../../../src/blocks/code'
import { Link } from '../../../src/router'

function Overview() {
  return (
    <>
      <Section title="Work beside the thing you opened">
        <p>
          Keep a resource list, its selected record, and a related record beside one another when
          there is room. On a phone the same chain becomes sheets: opening a related record presents
          another sheet, and dismissing it returns to the previous one without losing its place.
        </p>
        <p>
          One host coordinates the entire chain. A child requests another panel; it does not nest a
          second host, split view, or independently managed inspector inside itself.
        </p>
      </Section>
      <Section title="Content, navigation, presentation">
        <p>
          Keep record data, permissions, URL synchronization, and server mutations in your app.
          Supply stable identities and ordinary reusable content components. The host owns the
          available-space calculation and presentation lifecycle, not your resource model.
        </p>
        <p>
          Each panel has its own floating header, scrolling body, and optional action dock. Put
          contextual tools such as Edit in the header's trailing group. The close action belongs
          inside the same panel, not in the gap between columns.
        </p>
      </Section>
      <Section title="Controlled composition">
        <p>
          On the web, pass <C>panels</C> as an ordered array including the root at index zero, and echo
          <C>onPanelsChange</C> into your state. Each entry has a stable <C>id</C>, a <C>panel</C>
          element, and optional sizing preferences. <C>usePanelStack()</C> supplies <C>push</C>,
          <C>replace</C>, and <C>close</C>. Pass the originating panel ID to <C>push</C> when opening
          a related record; that truncates its old descendants.
        </p>
        <p>
          In Flutter, pass the root separately as <C>root</C> and the child chain as
          <C>List&lt;PanelEntry&gt;</C>. Content uses <C>PanelScope.of(context)</C> to request a child
          or close its branch. The Flutter example shows the native composition rather than a
          mechanical translation of web hooks.
        </p>
        <p>
          The host needs bounded height from its parent. A workspace should give it the available
          viewport through the scaffold's viewport slot, not nest it inside the page's scrolling
          content. Each panel owns its own measured scrolling region.
        </p>
      </Section>
      <Section title="One chain, any available width">
        <p>
          Width is measured on the host, not inferred from a device name or the browser window.
          Panel sizing preferences and the theme's shell gap determine what fits. When earlier
          panels cannot fit, they remain in the chain so going back restores them; the newest work
          stays reachable instead of squeezing every column below its minimum width.
        </p>
        <p>
          Compact presentations use the kit's <Link to="/components/sheet">Sheet</Link> behavior.
          Do not render a second copy of a form for phones. Draft and scroll state belong to the
          panel identity and should survive resizing the host.
        </p>
      </Section>
      <Section title="Closing and changing selection">
        <p>
          Closing a panel removes its descendants too. Selecting another record replaces the old
          branch instead of retaining panels that describe the previous selection. Keep IDs stable
          while updating a record; change identity when opening a different record.
        </p>
        <p>
          If closing would discard work, use the web host's <C>beforeClose</C> or the Flutter
          entry's <C>canClose</C> and show a confirmation. Guards include descendants and deduplicate
          pending requests. Direct updates to the controlled list remain authoritative: guard those
          in your app too. Server writes remain app-owned: apply optimistic UI with rollback,
          reconcile the response, and surface an actionable error. Opening a panel must not wait
          for its data request.
        </p>
      </Section>
      <Section title="Choose the smallest container that fits the job">
        <DoDont
          doItems={[
            'Use a panel host for a growing list → record → related-record workspace.',
            'Use SplitView for two columns whose deeper pages stay inside the detail column.',
            'Use Sheet for a temporary task or floating inspector that should overlay the page.',
            'Supply accessible panel names and visible close or back controls; verify Arabic RTL.',
          ]}
          dontItems={[
            'Hardcode an Apps or Orders layout into the UI kit.',
            'Mount desktop and mobile versions of the same form simultaneously.',
            'Use a global screen-width check in each detail component.',
          ]}
        />
        <p>
          Existing <Link to="/components/split-view">SplitView</Link> and <C>Sheet regular="pane"</C>
          remain useful independently; the panel host does not change their behavior.
        </p>
      </Section>
    </>
  )
}

export default definePage({
  section: 'components',
  id: 'panel-host',
  title: 'Adaptive panels',
  group: 'Navigation and layout',
  order: 1.5,
  summary: 'A growing chain of independent panels that shares desktop space and becomes stacked sheets on phones.',
  importLine: "import { PanelHost, Panel } from '@feeef.dev/ui/containers'",
  source: 'src/containers/panel-host.tsx',
  api: ['PanelHost', 'Panel'],
  keywords: ['panels', 'inspector', 'multi pane', 'columns', 'sheets', 'master detail', 'nested', 'responsive'],
  Overview,
  examples: examplesFrom(
    import.meta.glob('./examples/*.tsx', { eager: true }),
    import.meta.glob('./examples/*.tsx', { eager: true, query: '?raw', import: 'default' }),
    import.meta.glob('./examples/*.dart', { eager: true, query: '?raw', import: 'default' })
  ),
})
