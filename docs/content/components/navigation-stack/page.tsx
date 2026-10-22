import { definePage, examplesFrom } from '../../../src/model'
import { Callout, DoDont, Section, Table } from '../../../src/blocks/prose'
import { C, Code } from '../../../src/blocks/code'
import { Link } from '../../../src/router'

function Overview() {
  return (
    <>
      <Section title="When to use">
        <p>
          A navigation stack is the drill-down container of iOS: a list opens an item, the item opens a
          detail, and each step is a page pushed on top of the last. Use it whenever a person goes
          deeper into one thing and expects to come back the same way: orders → order → customer,
          settings → section → option, products → product.
        </p>
        <p>
          For a list and its detail side by side on wide screens, use a{' '}
          <Link to="/components/split-view">split view</Link>; it becomes this stack on phones. For a
          short task that should not change where the person is, use a{' '}
          <Link to="/components/sheet">sheet</Link> instead.
        </p>
      </Section>

      <Section title="Pages are children">
        <p>
          The stack has no router of its own. Its children are the pages, root first, each with a
          stable <C>key</C>. Append a page and the stack pushes it; remove the top page and it pops;
          change the top page to a different key and it cross-fades. Keep the path in state (or derive
          it from the URL) and map it to pages. <C>useNavigationPath</C> is the small state helper.
        </p>
        <Code
          code={`const nav = useNavigationPath<Route>()

<NavigationStack label="Orders" onBack={() => nav.pop()}>
  <NavigationPage key="orders" title="Orders">
    <ListRow chevron title="#1048" onClick={() => nav.push({ page: 'order', id: 1048 })} />
  </NavigationPage>
  {nav.path.map((route) => (
    <NavigationPage key={\`order-\${route.id}\`} title={\`Order #\${route.id}\`}>…</NavigationPage>
  ))}
</NavigationStack>`}
        />
        <p>
          Every page stays mounted while it is in the path, hidden and inert under the top one, so its
          scroll position, form drafts and loaded data are still there when the person comes back.
        </p>
      </Section>

      <Section title="Going back">
        <Table
          head={['Input', 'What happens']}
          rows={[
            ['Back button', 'Each pushed page shows a back button with the previous page’s title (just the chevron in narrow stacks). It calls onBack.'],
            ['Finger or pen', 'Swipe toward the trailing edge from anywhere on the page. The page follows the finger 1:1; on release, the stack projects the flick and either finishes going back or springs the page home. Horizontal scrollers, sliders and number fields keep their own drags.'],
            ['Mouse', 'Drag from the leading edge (the first 28px).'],
            ['Zoom pages', 'Also drag down when scrolled to the top: the page shrinks under the finger and drops back into its card.'],
          ]}
        />
        <p>
          <C>onBack</C> is a request: remove the top page in response. After a swipe the page is
          already off screen, so its removal does not animate again; if you keep the page, it slides
          back in.
        </p>
        <Callout tone="note" title="Browsers have their own back swipe">
          In Safari on iPhone, a swipe from the very edge of the screen goes back in browser history.
          Keep the path in the URL when a stack is the page’s main navigation, so the browser’s back
          gesture and the stack agree. <C>swipeBack="edge"</C> or <C>"off"</C> narrow or disable the
          stack’s own gesture.
        </Callout>
      </Section>

      <Section title="Titles and bars">
        <p>
          <C>NavigationPage</C> draws a floating glass bar: the back group, the title, and your{' '}
          <C>trailing</C> actions in their own group. The root page uses a large title that scrolls
          under the bar and then appears in it; pushed pages put the title in the bar. Set{' '}
          <C>titleDisplay</C> to choose. <C>bottom</C> floats a dock with the page’s main action.
        </p>
        <DoDont
          doItems={[
            'Name pages after what they show (“Order #1048”, “Amina Benali”) so the next page’s back button reads naturally.',
          ]}
          dontItems={['Repeat the stack name in every title, or add a second back button inside the content.']}
        />
      </Section>

      <Section title="Zoom transitions">
        <p>
          Mark the element a page comes from with <C>data-lab-zoom-source="id"</C> and give the pushed
          page <C>zoomSource="id"</C>. The page grows out of that element (matching its width and
          corners, clipping its height) and returns into it when it goes back. Use zoom when the
          element and the page are the same thing at two sizes: a product card and its page, a photo
          and its viewer. Rows that only open “more about this” slide.
        </p>
        <Code
          code={`<button onClick={() => nav.push(product.id)}>
  <img src={product.photo} data-lab-zoom-source={product.id} alt="" />
  {product.name}
</button>

<NavigationPage key={product.id} title={product.name} zoomSource={product.id}>…</NavigationPage>`}
        />
      </Section>

      <Section title="Physics">
        <p>
          All transitions run on one analytic spring (<C>SPRINGS.smooth</C>, no overshoot) that
          knows its velocity at every frame. Going back in the middle of a push reverses the same motion
          without a jump, and a released swipe continues at the finger’s speed (
          <C>SPRINGS.release</C>). Only <C>transform</C>, <C>opacity</C> and <C>clip-path</C>{' '}
          change while pages move. See <Link to="/foundations/physics">Physics</Link>.
        </p>
      </Section>

      <Section title="Accessibility">
        <ul>
          <li>Pushing moves focus to the new page’s title; going back returns it to the control that pushed.</li>
          <li>Pages under the top one are inert and hidden from assistive technology.</li>
          <li>The back button is labelled “Back to ‹title›”; the swipe is never the only way back.</li>
          <li>
            With reduced motion, pages cross-fade instead of sliding or zooming, and drag-to-dismiss is
            off. Tab order follows the visible page only.
          </li>
          <li>In right-to-left languages pages arrive from the left and the swipe goes left to right.</li>
        </ul>
      </Section>
    </>
  )
}

export default definePage({
  section: 'components',
  id: 'navigation-stack',
  title: 'Navigation stack',
  group: 'Navigation and layout',
  order: 0,
  summary: 'Push-and-pop pages with interactive swipe back, collapsing large titles and zoom transitions.',
  importLine:
    "import { NavigationStack, NavigationPage, useNavigationPath } from '@feeef.dev/ui/containers'",
  source: 'src/containers/navigation-stack.tsx',
  api: ['NavigationStack', 'NavigationPage'],
  keywords: ['navigation', 'push', 'pop', 'back', 'swipe', 'drill down', 'zoom', 'hero', 'ios', 'page'],
  Overview,
  examples: examplesFrom(
    import.meta.glob('./examples/*.tsx', { eager: true }),
    import.meta.glob('./examples/*.tsx', { eager: true, query: '?raw', import: 'default' })
  ),
})
