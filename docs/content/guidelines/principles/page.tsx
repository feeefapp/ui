import { Bold, Italic, Underline } from 'lucide-react'
import { Button, IconButton } from '@feeef.dev/ui/primitives/button'
import { TextField } from '@feeef.dev/ui/primitives/text-field'
import { ToolbarGroup } from '@feeef.dev/ui/toolbar'
import { definePage } from '../../../src/model'
import { Link } from '../../../src/router'
import { C } from '../../../src/blocks/code'
import { Callout, Lead } from '../../../src/blocks/prose'
import { Compare, Principle } from '../_lib/compare'

function Overview() {
  return (
    <>
      <Lead>
        Components only make a good product when they are used for the right job, in the right place.
        These ten principles are the reasons behind the kit. When a guideline doesn’t cover your case,
        decide with these.
      </Lead>
      <Callout title="Who uses what we build">
        <p>
          Feeef apps are used by merchants, confirmation agents and couriers. They spend whole days in the
          same few screens (orders, confirmation calls, stock), often on a phone, often in Arabic, often
          in a hurry. Every principle below protects their speed and their trust.
        </p>
      </Callout>

      <Principle
        n={1}
        id="content-first"
        title="Content first; chrome floats"
        why="The orders, products and numbers are the product. Interface chrome exists only to act on them, so it stays out of their way."
        how={[
          <>Put page content on stable, opaque surfaces: the scaffold’s content panel, cards, dialogs.</>,
          <>Float tools over the content in glass groups (app bar, docks) and let the scroll area reserve their space and fade content beneath them. Never stack fixed header bars.</>,
          <>Remove chrome before adding it. If a control is used once a week, it belongs in a menu, not a bar.</>,
        ]}
      />

      <Principle
        n={2}
        id="one-primary-action"
        title="One primary action per view"
        why="On a confirmation call, an agent must know instantly what moves the order forward. Two loud buttons make them read; one makes them act."
        how={[
          <>One <C>filled</C> button per view or dialog, at the end of the reading direction.</>,
          <>Everything else steps down: <C>tonal</C> for supporting actions, <C>text</C> for cancel and secondary paths.</>,
          <>Destructive actions are <C>destructive</C>, never the default, and ask for confirmation.</>,
        ]}
      >
        <Compare
          good={
            <div className="demo-row">
              <Button variant="text">Cancel</Button>
              <Button variant="tonal">Save draft</Button>
              <Button variant="filled">Confirm order</Button>
            </div>
          }
          goodNote="One filled action; the rest step down in emphasis."
          bad={
            <div className="demo-row">
              <Button variant="filled">Cancel</Button>
              <Button variant="filled">Save draft</Button>
              <Button variant="filled">Confirm order</Button>
            </div>
          }
          badNote="Three equal buttons: nothing tells the agent which one matters."
        />
      </Principle>

      <Principle
        n={3}
        id="tools-travel-together"
        title="Related tools travel together"
        why="People find a tool by finding its group. Scattered buttons each demand attention; a group reads as one thing."
        how={[
          <>Put related controls in one <C>ToolbarGroup</C>: navigation, view, tools, page actions. One bubble per purpose.</>,
          <>Controls inside a group use <C>appearance="toolbar"</C>, so they share its material instead of painting their own.</>,
          <>When space runs out, a group overflows into a menu (<C>ActionsBar</C>); it does not wrap or shrink its targets.</>,
          <>Two levels at most: a surface, then the bubbles on it. Never a bubble inside a bubble. Content inside a surface stays flat (a calendar heading is a plain row), and the bubbles on one surface share their height and line up with its content.</>,
        ]}
      >
        <Compare
          good={
            <ToolbarGroup label="Text style">
              <IconButton variant="text" appearance="toolbar" aria-label="Bold" aria-pressed="true">
                <Bold size={18} />
              </IconButton>
              <IconButton variant="text" appearance="toolbar" aria-label="Italic">
                <Italic size={18} />
              </IconButton>
              <IconButton variant="text" appearance="toolbar" aria-label="Underline">
                <Underline size={18} />
              </IconButton>
            </ToolbarGroup>
          }
          goodNote="One glass group, one purpose, shared material."
          bad={
            <div className="demo-row" style={{ gap: 24 }}>
              <IconButton variant="elevated" aria-label="Bold">
                <Bold size={18} />
              </IconButton>
              <IconButton variant="elevated" aria-label="Italic">
                <Italic size={18} />
              </IconButton>
              <IconButton variant="elevated" aria-label="Underline">
                <Underline size={18} />
              </IconButton>
            </div>
          }
          badNote="Three raised buttons that look unrelated and compete for attention."
        />
      </Principle>

      <Principle
        n={4}
        id="navigation-work-details"
        title="Navigation, work, details: in that order"
        why="A stable spatial model means people stop looking for things. Navigation is always at the start, the work is in the middle, details sit at the end."
        how={[
          <>Desktop: sidebar → content → inspector. Phones: the same order, collapsed (drawer, content, sheet or dialog).</>,
          <>As the screen shrinks, collapse in a fixed order: the inspector moves into a dialog, the sidebar becomes a rail and then a drawer, view switches drop to a bottom dock.</>,
          <>The logo and page identity rise into the app bar when the sidebar collapses; nothing disappears, it moves. See <Link to="/guidelines/layout">Layout</Link>.</>,
        ]}
      />

      <Principle
        n={5}
        id="comfortable-by-default"
        title="Comfortable by default, dense on purpose"
        why="Most Feeef work happens on phones with thumbs. Density is a decision for a whole app, made for people who need it, not a way to fit one more column."
        how={[
          <>Choose <C>density</C> once in the theme config: <C>comfortable</C> for merchant apps, <C>compact</C> for consoles and admin lists, <C>thin</C> only for very dense tools.</>,
          <>Never shrink a single screen by hand. Touch always keeps 44px targets.</>,
          <>If a screen feels crowded, remove things or split it; don’t compress it.</>,
        ]}
      />

      <Principle
        n={6}
        id="color-means-something"
        title="Color means something"
        why="When color is reserved for meaning, people read state at a glance: what they can do, what went wrong, what succeeded."
        how={[
          <>Primary color marks the main action, the current selection and focus. Red means destructive or error; green means success. Everything else is neutral.</>,
          <>Never color for decoration, and never rely on color alone: pair it with a label or icon.</>,
          <>Brand an app through <C>theme.primary</C> and <C>palette</C>, not by painting components.</>,
        ]}
      >
        <Compare
          good={
            <div className="demo-row">
              <Button variant="text">Keep order</Button>
              <Button variant="destructive">Cancel order</Button>
            </div>
          }
          goodNote="Red only for the action that destroys something."
          bad={
            <div className="demo-row">
              <Button variant="destructive">Save changes</Button>
              <Button variant="destructive">Export CSV</Button>
            </div>
          }
          badNote="Red used for emphasis: people learn to ignore it, then miss a real danger."
        />
      </Principle>

      <Principle
        n={7}
        id="motion-explains"
        title="Motion explains change"
        why="Motion tells people where something came from and where it went. Motion that explains nothing only slows them down."
        how={[
          <>Springs for direct manipulation (sliders, docks resizing); short fades for things that appear and leave (<C>Presence</C>).</>,
          <>Never animate data that people are reading, and never block input while something animates.</>,
          <>Everything respects reduced motion. See <Link to="/foundations/motion">Motion</Link>.</>,
        ]}
      />

      <Principle
        n={8}
        id="speak-like-a-colleague"
        title="Speak like a helpful colleague"
        why="Interface text is the product talking. Clear, short, specific words save support calls and lost orders."
        how={[
          <>Sentence case everywhere. Buttons say what happens: “Confirm order”, not “Submit”.</>,
          <>Errors say how to fix it, in the field where it happened. Limits are next steps (“Add funds”), not dead-end toasts.</>,
          <>See <Link to="/guidelines/writing">Writing</Link> for the full rules.</>,
        ]}
      >
        <Compare
          good={
            <div className="demo-column">
              <TextField
                hint="Customer phone"
                defaultValue="0555 12 34"
                error="Enter all 10 digits, starting with 05, 06 or 07."
              />
            </div>
          }
          goodNote="Says exactly what to fix, at the field."
          bad={
            <div className="demo-column">
              <TextField hint="Customer phone" defaultValue="0555 12 34" error="Invalid input." />
            </div>
          }
          badNote="True, but useless: the agent still doesn’t know what to type."
        />
      </Principle>

      <Principle
        n={9}
        id="everyone-every-language"
        title="For everyone, in every language"
        why="Many of our users read Arabic first, some use screen readers or only a keyboard, and many work on old phones in bright sunlight."
        how={[
          <>Right-to-left is not a mode you test later: use logical properties (<C>inline-start</C>), mirror directional icons (<C>lab-dir-flip</C>), check every screen in Arabic.</>,
          <>Native elements, real labels, visible focus, focus that returns where it came from.</>,
          <>Contrast that survives sunlight: don’t lighten text or borders below the tokens. See <Link to="/get-started/accessibility">Accessibility</Link>.</>,
        ]}
      />

      <Principle
        n={10}
        id="configure-dont-override"
        title="Configure, don’t override"
        why="Every override is a fork of the design system that nobody maintains. The kit stays consistent only if apps change it through its own settings."
        how={[
          <>Change the look through <C>ThemeConfig</C> and tokens; never restyle a kit component with your own CSS or class names.</>,
          <>Lay components out (position, gaps) freely; don’t repaint them (color, radius, height, shadow).</>,
          <>If the kit can’t do what a screen needs, extend the kit for everyone instead of hand-rolling a one-off.</>,
        ]}
      />

      <Callout title="The same rules, for you and your coding agent">
        <p>
          A short form of these guidelines ships with the package as{' '}
          <C>node_modules/@feeef.dev/ui/DESIGN.md</C>. Point your AI coding agent at it (for example from
          your repo’s <C>AGENTS.md</C> or <C>CLAUDE.md</C>) so screens it builds follow the same principles.
        </p>
      </Callout>
    </>
  )
}

export default definePage({
  section: 'guidelines',
  id: 'principles',
  title: 'Principles',
  order: 1,
  summary: 'The ten ideas behind the kit: why it is shaped this way, and how to decide when no guideline covers your case.',
  keywords: ['philosophy', 'design principles', 'why', 'rules', 'one primary action', 'glass', 'content first'],
  Overview,
})
