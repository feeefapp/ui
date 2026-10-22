import { useState } from 'react'
import { ArrowRight, Languages, Paintbrush, Accessibility, Boxes, Search } from 'lucide-react'
import { Button } from '@feeef.dev/ui/primitives/button'
import { TextField } from '@feeef.dev/ui/primitives/text-field'
import { SegmentedControl } from '@feeef.dev/ui/primitives/segmented'
import { SlideSwitch, Slider } from '@feeef.dev/ui/primitives/slider'
import { Checkbox } from '@feeef.dev/ui/primitives/choice'
import { Code } from '../blocks/code'
import { navigate } from '../router'
import pkg from '../../../package.json'

const INSTALL = `npm install "@feeef.dev/ui@github:feeefapp/ui#v${pkg.version}"`

const FEATURES = [
  {
    icon: Paintbrush,
    title: 'Themed by configuration',
    text: 'Palette, density and corner radius are one ThemeConfig. Components read tokens, never literals.',
  },
  {
    icon: Languages,
    title: 'Arabic, French and English',
    text: 'Built-in strings in three languages and logical CSS throughout, so right-to-left just works.',
  },
  {
    icon: Accessibility,
    title: 'Accessible by default',
    text: 'Native elements own their semantics: real inputs, labelled hit areas, focus that returns where it came from.',
  },
  {
    icon: Boxes,
    title: 'Framework-neutral',
    text: 'Plain React 19. Routing, storage and clipboard are injected services, so it runs in Inertia, Next.js or Vite.',
  },
]

export function HomePage() {
  return (
    <div className="docs-home">
      <section className="docs-hero">
        <div className="docs-hero-text">
          <p className="docs-eyebrow">@feeef.dev/ui · v{pkg.version}</p>
          <h1>The Feeef web UI kit</h1>
          <p>
            The components, tokens and layout system behind Feeef Lab and the Cloud console. One
            design language for every Feeef web app.
          </p>
          <div className="docs-hero-actions">
            <Button variant="filled" onClick={() => navigate('/get-started/introduction')}>
              Get started <ArrowRight size={18} className="docs-dir-flip" />
            </Button>
            <Button variant="elevated" onClick={() => navigate('/components')}>
              Browse components
            </Button>
          </div>
          <Code code={INSTALL} lang="bash" title="Install" />
        </div>
        <HeroDemo />
      </section>
      <section className="docs-features" aria-label="Highlights">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <div key={title} className="docs-feature">
            <Icon size={22} aria-hidden="true" />
            <h2>{title}</h2>
            <p>{text}</p>
          </div>
        ))}
      </section>
    </div>
  )
}

/** A small working form built only from kit components. */
function HeroDemo() {
  const [plan, setPlan] = useState<'monthly' | 'yearly'>('monthly')
  const [seats, setSeats] = useState(5)
  const [notify, setNotify] = useState(true)
  return (
    <div className="docs-hero-demo" aria-label="Live components">
      <TextField hint="Search orders" leadingIcon={<Search size={18} />} />
      <SegmentedControl
        label="Billing"
        value={plan}
        onChange={setPlan}
        options={[
          { value: 'monthly', label: 'Monthly' },
          { value: 'yearly', label: 'Yearly' },
        ]}
      />
      <div className="docs-playground-slider">
        <span aria-hidden="true">
          Seats <output>{seats}</output>
        </span>
        <Slider label="Seats" min={1} max={20} value={seats} onValueChange={setSeats} />
      </div>
      <div className="docs-playground-row">
        <span aria-hidden="true">Email me about new orders</span>
        <SlideSwitch label="Email me about new orders" checked={notify} onCheckedChange={setNotify} />
      </div>
      <Checkbox label="Remember this device" defaultChecked />
      <div className="docs-hero-demo-actions">
        <Button variant="text">Cancel</Button>
        <Button variant="filled">Save changes</Button>
      </div>
    </div>
  )
}
