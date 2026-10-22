import type React from 'react'
import { useState, type ReactNode } from 'react'
import { LucideArrowRight, LucideDownload, LucidePlus, LucideSearch, LucideTrash2 } from 'lucide-react'
import { Button, IconButton } from '@feeef.dev/ui/primitives/button'
import { SegmentedControl } from '@feeef.dev/ui/primitives/segmented'
import { Checkbox, RadioGroup } from '@feeef.dev/ui/primitives/choice'
import { ProBadge } from '@feeef.dev/ui/primitives/badge'

/**
 * Scenes shared with flutter/example/lib/scenes.dart: same ids, same content, same layout.
 * Each is a column of rows (flex-wrap, 12px gap) in a 720px stage with 24px padding.
 */
export const SCENES: Record<string, () => ReactNode> = {
  buttons: () => (
    <div className="row">
      <Button variant="filled">Filled</Button>
      <Button variant="tonal">Tonal</Button>
      <Button variant="elevated">Elevated</Button>
      <Button variant="outlined">Outlined</Button>
      <Button variant="text">Text</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="destructive">Delete</Button>
    </div>
  ),
  'button-states': () => (
    <>
      <div className="row">
        <Button variant="filled" controlSize="compact">Compact</Button>
        <Button variant="elevated" controlSize="compact">Compact</Button>
        <Button variant="tonal" aria-pressed>Selected</Button>
        <Button variant="elevated" disabled>Disabled</Button>
      </div>
      <div className="row">
        <Button variant="filled" appearance="toolbar">Toolbar filled</Button>
        <Button variant="elevated" appearance="toolbar">Toolbar elevated</Button>
        <Button variant="outlined" appearance="toolbar">Toolbar outlined</Button>
      </div>
    </>
  ),
  segmented: () => <Segmented />,
  choices: () => (
    <>
      <div className="row">
        <Checkbox label="Cash on delivery" checked onChange={() => {}} />
        <Checkbox label="Stop desk" onChange={() => {}} />
        <Checkbox label="Some orders" indeterminate onChange={() => {}} />
        <Checkbox label="Disabled" disabled onChange={() => {}} />
      </div>
      <Checkbox
        label="Product reviews"
        description="Ask delivered customers to rate what they bought."
        checked
        onChange={() => {}}
      />
      <div className="row">
        <Checkbox label="Compact" controlSize="compact" checked onChange={() => {}} />
        <Checkbox label="Accept terms" error="Accept the terms to continue." onChange={() => {}} />
      </div>
      <RadioGroup
        label="Delivery speed"
        value="express"
        onValueChange={() => {}}
        options={[
          { value: 'standard', label: 'Standard', description: '2 to 4 days' },
          { value: 'express', label: 'Express', description: 'Next day' },
          { value: 'pickup', label: 'Pickup', disabled: true },
        ]}
      />
      <div className="row">
        <span>Voice cloning</span>
        <ProBadge />
      </div>
    </>
  ),
  icons: () => (
    <>
      <div className="row">
        <Button variant="filled">
          <LucidePlus size={18} />
          New order
        </Button>
        <Button variant="elevated">
          <LucideDownload size={18} />
          Export CSV
        </Button>
        <Button variant="text">
          Continue
          <LucideArrowRight size={18} />
        </Button>
      </div>
      <div className="row">
        <IconButton variant="text" aria-label="Search"><LucideSearch /></IconButton>
        <IconButton variant="filled" aria-label="Add"><LucidePlus /></IconButton>
        <IconButton variant="elevated" aria-label="Delete"><LucideTrash2 /></IconButton>
        <IconButton variant="text" controlSize="compact" aria-label="Search"><LucideSearch /></IconButton>
        <IconButton variant="elevated" controlSize="compact" aria-label="Delete"><LucideTrash2 /></IconButton>
      </div>
      <div className="row" style={{ color: 'var(--lab-ink)' }}>
        <LucideSearch />
        <LucidePlus />
        <LucideTrash2 />
        <LucideDownload />
      </div>
    </>
  ),
  // Raw corner geometry: native corner-shape in Chrome vs the kit's superellipse maths.
  corners: () => (
    <div className="row">
      {[12, 23, 40].map((radius) => (
        <div key={radius} style={{ width: 200, height: 100, borderRadius: radius, cornerShape: 'superellipse(1.5)', background: 'var(--lab-ink)' } as React.CSSProperties} />
      ))}
    </div>
  ),
}

function Segmented() {
  const [delivery, setDelivery] = useState('home')
  const [range, setRange] = useState('week')
  return (
    <>
      <SegmentedControl
        label="Delivery type"
        value={delivery}
        onChange={setDelivery}
        options={[
          { value: 'home', label: 'Home delivery' },
          { value: 'desk', label: 'Stop desk' },
        ]}
      />
      <SegmentedControl
        label="Summary period"
        value={range}
        onChange={setRange}
        options={[
          { value: 'today', label: 'Today' },
          { value: 'week', label: 'This week' },
          { value: 'month', label: 'This month', disabled: true },
        ]}
      />
      <SegmentedControl
        label="View"
        appearance="plain"
        value="list"
        onChange={() => {}}
        options={[
          { value: 'grid', label: 'Grid' },
          { value: 'list', label: 'List' },
        ]}
      />
    </>
  )
}
