import { PixelLoader } from '@feeef.dev/ui/pixel-art'
import { definePage, examplesFrom } from '../../../src/model'
import { Callout, DoDont, Section, Table } from '../../../src/blocks/prose'
import { C, Code } from '../../../src/blocks/code'
import { Link } from '../../../src/router'
import './pull-demo.css'

function Overview() {
  return (
    <>
      <Section title="When to use">
        <p>
          Pull to refresh fetches what changed in a list people keep open: new orders, a courier’s
          parcels, the confirmation queue. Pull the list down from the top on a touch screen and
          release past the threshold: the content stays open over a small pixel loader until the
          refresh finishes, then springs back. It is a <C>ScrollArea</C> option, so it works with
          the area’s floating top bar: the loader appears just below the reserved top space.
        </p>
      </Section>

      <Section title="Turn it on">
        <p>
          Pass <C>onRefresh</C>, a function that returns a promise (Flutter: a <C>Future</C>). Nothing
          else changes: without it the area scrolls as before.
        </p>
        <Code
          code={`const refresh = useRefreshController()

<ScrollArea
  label="New orders"
  onRefresh={() => refetchOrders()}
  refreshController={refresh}
  top={<Toolbar … trailing={<IconButton aria-label="Refresh" onClick={() => refresh.refresh()}>…</IconButton>} />}
>
  <OrderList />
</ScrollArea>`}
        />
        <Table
          head={['Prop', 'Use']}
          rows={[
            [<C>onRefresh</C>, 'Runs the refresh. The loader stays until it settles; a rejected promise still closes it, so report failures yourself.'],
            [<C>refreshController</C>, <>Starts the same refresh from code: <C>controller.refresh()</C>; <C>controller.refreshing</C> tells whether one runs.</>],
          ]}
        />
      </Section>

      <Section title="How it moves">
        <p>
          The pull starts after 6px of downward travel at the very top, follows the finger with the
          kit’s rubber band (it resists more the further you pull) and refreshes when released past
          64px. While refreshing the content holds 52px open: the 20px loader with 16px above and
          below. Releasing short of the threshold springs back on <C>SPRINGS.release</C>; the end of a
          refresh closes on <C>SPRINGS.smooth</C>. Squares of the loader light up as the pull nears the
          threshold, then the wave runs while refreshing. Only transforms move.
        </p>
        <p>
          Under reduced motion (or ThemeConfig <C>motion: 'none'</C>) there is no rubber band and no
          spring: the content follows at half the finger’s speed and jumps open and closed. A mouse or
          trackpad never pulls; in Flutter neither does a mouse drag. The geometry is pure and shared:{' '}
          <C>pullDistance</C>, <C>pullRelease</C>, <C>pullProgress</C> and <C>PULL_REFRESH</C>.
        </p>
      </Section>

      <Section title="Guidelines">
        <DoDont
          doItems={[
            'Also offer a Refresh button (or menu item) driven by the same RefreshController: a mouse, a keyboard or a switch cannot pull.',
            'Use it on lists that change while people look at them.',
            'Keep the list on screen while refreshing; update it in place when new data arrives.',
          ]}
          dontItems={[
            'Use pull to refresh as the only way to load data.',
            'Show a second spinner or a full-screen loader for the same refresh.',
            'Put it on forms or pages whose content the person is editing.',
          ]}
        />
      </Section>

      <Section title="Accessibility">
        <p>
          A refresh is announced politely when it starts (“Refreshing…”) and ends (“Updated”), in the
          app’s language. Flutter adds a Refresh custom action to the scroll region, so screen reader
          users can run it without the gesture. On the web there is no standard action for it: give
          the page a visible Refresh button, like the example, which also serves keyboard and mouse
          users.
        </p>
        <Callout title="Lists people work through">
          <p>
            New rows appear at the top while the person may be further down; keep their place (the
            area does not scroll for you) and see <Link to="/components/list">List</Link> for rows.
          </p>
        </Callout>
      </Section>
    </>
  )
}

export default definePage({
  section: 'components',
  id: 'pull-to-refresh',
  title: 'Pull to refresh',
  group: 'Navigation and layout',
  order: 2.5,
  summary: 'Pull a scroll area down at the top to refresh it, with a pixel loader below the floating top bar.',
  importLine: "import { ScrollArea, useRefreshController } from '@feeef.dev/ui/scroll'",
  source: 'src/scroll/pull-refresh.tsx',
  api: ['ScrollArea'],
  keywords: ['pull', 'refresh', 'reload', 'swipe down', 'refresh control', 'RefreshIndicator', 'onRefresh'],
  Overview,
  examples: examplesFrom(
    import.meta.glob('./examples/*.tsx', { eager: true }),
    import.meta.glob('./examples/*.tsx', { eager: true, query: '?raw', import: 'default' }),
    import.meta.glob('./examples/*.dart', { eager: true, query: '?raw', import: 'default' })
  ),
  Preview: () => <PixelLoader size={28} progress={0.6} decorative />,
})
