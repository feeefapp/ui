import type React from 'react'
import { useState, type ReactNode } from 'react'
import { LucideArrowRight, LucideDownload, LucidePlus, LucideSearch, LucideTrash2 } from 'lucide-react'
import { Button, IconButton } from '@feeef.dev/ui/primitives/button'
import { SegmentedControl } from '@feeef.dev/ui/primitives/segmented'
import { Checkbox, RadioGroup } from '@feeef.dev/ui/primitives/choice'
import { ProBadge } from '@feeef.dev/ui/primitives/badge'
import { Slider, SlideSwitch } from '@feeef.dev/ui/primitives/slider'
import { TextField } from '@feeef.dev/ui/primitives/text-field'
import { LucidePhone, LucideUndo2, LucideRedo2, LucideBold, LucideItalic, LucideUnderline, LucideShare } from 'lucide-react'
import { GlassGroup } from '@feeef.dev/ui/scaffold'
import { Toolbar, ToolbarGroup } from '@feeef.dev/ui/toolbar'
import { GlassContainer } from '@feeef.dev/ui/glass'
import { Dock } from '@feeef.dev/ui/dock'
import { PopoverSurface } from '@feeef.dev/ui/primitives/popover-surface'
import { ScrollArea } from '@feeef.dev/ui/scroll'
import { Modal } from '@feeef.dev/ui/primitives/modal'
import { Select, Option } from '@feeef.dev/ui/primitives/select'
import { ListSection, ListRow } from '@feeef.dev/ui/primitives/list'
import { LucideStore, LucideArchive } from 'lucide-react'
import { ActionsBar } from '@feeef.dev/ui/actions'
import { NumberField } from '@feeef.dev/ui/primitives/number-field'
import type { Action } from '@feeef.dev/ui/actions'
import { LucidePrinter, LucideTruck, LucideX } from 'lucide-react'

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
  glass: () => (
    <>
      <GlassGroup style={{ display: 'flex', gap: 4, padding: 6 }}>
        <Button appearance="toolbar" variant="ghost">Drafts</Button>
        <Button appearance="toolbar" variant="filled">Publish</Button>
      </GlassGroup>
      <div style={{ alignSelf: 'stretch' }}>
        <Toolbar
          label="Editor"
          leading={
            <ToolbarGroup label="Format">
              <IconButton appearance="toolbar" controlSize="compact" aria-label="Undo"><LucideUndo2 /></IconButton>
              <IconButton appearance="toolbar" controlSize="compact" aria-label="Redo"><LucideRedo2 /></IconButton>
              <IconButton appearance="toolbar" controlSize="compact" aria-label="Bold"><LucideBold /></IconButton>
              <IconButton appearance="toolbar" controlSize="compact" aria-label="Italic"><LucideItalic /></IconButton>
              <IconButton appearance="toolbar" controlSize="compact" aria-label="Underline"><LucideUnderline /></IconButton>
            </ToolbarGroup>
          }
          trailing={
            <ToolbarGroup label="Share">
              <Button appearance="toolbar" controlSize="compact" variant="filled"><LucideShare size={18} />Share</Button>
            </ToolbarGroup>
          }
        />
      </div>
      <GlassContainer spacing={16} style={{ display: 'flex', gap: 10 }}>
        <ToolbarGroup label="Zoom">
          <IconButton appearance="toolbar" controlSize="compact" aria-label="Undo"><LucideUndo2 /></IconButton>
          <IconButton appearance="toolbar" controlSize="compact" aria-label="Redo"><LucideRedo2 /></IconButton>
        </ToolbarGroup>
        <ToolbarGroup label="Style">
          <IconButton appearance="toolbar" controlSize="compact" aria-label="Bold"><LucideBold /></IconButton>
        </ToolbarGroup>
      </GlassContainer>
      <GlassContainer spacing={16} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <SegmentedControl
          label="View"
          value="grid"
          onChange={() => {}}
          options={[
            { value: 'list', label: 'List' },
            { value: 'grid', label: 'Grid' },
          ]}
        />
        <ToolbarGroup label="Add">
          <IconButton appearance="toolbar" controlSize="compact" aria-label="Bold"><LucideBold /></IconButton>
        </ToolbarGroup>
      </GlassContainer>
    </>
  ),
  dock: () => (
    <>
      <div style={{ alignSelf: 'stretch' }}>
        <Dock
          label="Order"
          content={
            <>
              <strong>Order #1042</strong>
              <small>3 items · 4,500 DZD</small>
            </>
          }
        >
          <Button variant="tonal" controlSize="compact">
            <LucidePrinter size={18} />
            Print
          </Button>
          <Button variant="filled" controlSize="compact">
            <LucideTruck size={18} />
            Ship
          </Button>
        </Dock>
      </div>
      <div style={{ alignSelf: 'stretch' }}>
        <Dock label="Selection" align="start" content={<span>2 selected</span>}>
          <IconButton controlSize="compact" aria-label="Clear"><LucideX /></IconButton>
        </Dock>
      </div>
    </>
  ),
  popover: () => (
    <div className="row" style={{ alignItems: 'flex-start' }}>
      <PopoverSurface style={{ width: 240, padding: 8, font: "14px/20px 'Parity Plex'" }}>
        <div style={{ padding: '10px 12px' }}>Duplicate</div>
        <div style={{ padding: '10px 12px' }}>Move to archive</div>
        <div style={{ padding: '10px 12px', color: 'var(--lab-danger)' }}>Delete order</div>
      </PopoverSurface>
      <PopoverSurface seed="lab-popover-2" style={{ width: 200, height: 120 }} />
    </div>
  ),
  scroll: () => (
    <div
      style={{
        alignSelf: 'stretch',
        height: 300,
        border: '1px solid var(--lab-line)',
        borderRadius: 'var(--lab-radius-panel)',
        cornerShape: 'superellipse(1.5)',
        background: 'var(--lab-surface)',
        overflow: 'hidden',
      } as React.CSSProperties}
    >
      <ScrollArea
        label="Orders"
        top={
          <ToolbarGroup label="Filters">
            <Button variant="ghost" appearance="toolbar" controlSize="compact">All</Button>
            <Button variant="ghost" appearance="toolbar" controlSize="compact">Open</Button>
          </ToolbarGroup>
        }
        bottom={
          <Dock label="Orders" content={<span>24 orders</span>}>
            <Button variant="filled" controlSize="compact">New order</Button>
          </Dock>
        }
      >
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} style={{ font: "14px/20px 'Parity Plex'", padding: '10px 0', borderBottom: '1px solid var(--lab-line)' }}>
            Order #{1040 + i}
          </div>
        ))}
      </ScrollArea>
    </div>
  ),
  numbers: () => (
    <div className="grid">
      <NumberField label="Quantity" defaultValue={3} min={1} />
      <NumberField label="Discount" defaultValue={25} min={0} max={100} step={5} unit="%" />
      <NumberField label="Price" defaultValue={2500} step={50} unit="DZD" variant="outlined" />
      <NumberField label="Weight" defaultValue={1.25} step={0.25} unit="kg" controlSize="compact" steppers={false} />
      <NumberField label="Volume" defaultValue={40} min={0} max={100} disabled />
    </div>
  ),
  actions: () => {
    const actions: Action[] = [
      { type: 'action', id: 'print', label: 'Print', icon: <LucidePrinter />, onAction: () => {} },
      { type: 'action', id: 'ship', label: 'Ship', icon: <LucideTruck />, variant: 'filled', priority: 2, onAction: () => {} },
      { type: 'toggle', id: 'cod', label: 'Cash on delivery', checked: true, onCheckedChange: () => {} },
      { type: 'action', id: 'archive', label: 'Archive', icon: <LucideArchive />, priority: -1, onAction: () => {} },
      { type: 'action', id: 'delete', label: 'Delete', destructive: true, priority: -2, onAction: () => {} },
    ]
    return (
      <>
        <div style={{ alignSelf: 'stretch' }}>
          <ActionsBar label="Order actions" actions={actions} />
        </div>
        <div style={{ width: 300 }}>
          <ActionsBar label="Order actions" actions={actions} />
        </div>
        <div style={{ width: 300 }}>
          <ActionsBar label="Order actions" actions={actions} size="compact" align="start" />
        </div>
      </>
    )
  },
  list: () => (
    <div style={{ alignSelf: 'stretch' }}>
      <ListSection header="Store" footer="Shown on receipts and the storefront.">
        <ListRow leading={<LucideStore />} title="Name" trailing="Amina shop" chevron onClick={() => {}} />
        <ListRow
          leading={<LucidePhone />}
          title="Phone"
          subtitle="Shown to couriers"
          trailing="0555 12 34 56"
          chevron
          onClick={() => {}}
        />
        <ListRow title="Payments" selected onClick={() => {}} />
      </ListSection>
      <ListSection label="About">
        <ListRow static title="Version" trailing="0.10.0" />
        <ListRow static title="Region" trailing="Algeria" />
      </ListSection>
    </div>
  ),
  select: () => (
    <>
      <div className="grid">
        <Select label="Wilaya" value="oran" onValueChange={() => {}}>
          <Option value="alger">Alger</Option>
          <Option value="oran">Oran</Option>
        </Select>
        <Select label="Courier" value={null} onValueChange={() => {}}>
          <Option value="yalidine">Yalidine</Option>
        </Select>
        <Select label="Status" value={null} required error="Choose an option." onValueChange={() => {}}>
          <Option value="open">Open</Option>
        </Select>
        <Select label="Compact" controlSize="compact" variant="outlined" value="a" onValueChange={() => {}}>
          <Option value="a">Small</Option>
        </Select>
      </div>
      <div className="row">
        <Select aria-label="Sort" value="new" onValueChange={() => {}}>
          <Option value="new">Newest first</Option>
        </Select>
        <Select aria-label="Size" controlSize="compact" value="20" onValueChange={() => {}}>
          <Option value="20">20 per page</Option>
        </Select>
      </div>
    </>
  ),
  modal: () => (
    <Modal label="Delete order" close={() => {}}>
      <div style={{ padding: 24, font: "15px/22px 'Parity Plex'" }}>
        <div style={{ font: "500 20px/28px 'Parity Plex'", marginBottom: 8 }}>Delete order #1042?</div>
        <div style={{ color: 'var(--lab-muted)', marginBottom: 20 }}>
          The customer won't be notified. You can't undo this.
        </div>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <Button variant="text">Cancel</Button>
          <Button variant="destructive">Delete</Button>
        </div>
      </div>
    </Modal>
  ),
  text: () => (
    <div className="row">
      {[[12, 14], [14, 20], [15, 20], [16, 20], [16, 24], [13, 20], [17, 24], [18, 24], [20, 28], [24, 32], [11, 16], [10, 12]].map(([size, line]) => (
        <div key={`${size}/${line}`} style={{ font: `${size}px/${line}px 'Parity Plex'`, background: 'var(--lab-line)' }}>
          Amina {size}/{line}
        </div>
      ))}
    </div>
  ),
  fields: () => (
    <>
      <div className="grid">
        <TextField label="Customer name" />
        <TextField label="Customer name" defaultValue="Amina Benali" />
        <TextField label="Phone" leadingIcon={<LucidePhone />} leading="+213" defaultValue="555 12 34 56" />
        <TextField label="Price" trailing="DZD" defaultValue="2500" />
        <TextField label="Email" defaultValue="amina@" error="Enter a full email address." />
        <TextField label="Note" supportingText="Shown to the courier." showCounter maxLength={80} defaultValue="Call before" />
        <TextField label="City" labelStyle="inside" defaultValue="Oran" />
        <TextField label="City" labelStyle="inside" />
        <TextField placeholder="Search orders" />
        <TextField label="Compact" controlSize="compact" defaultValue="Small" />
        <TextField label="Tonal" variant="tonal" defaultValue="Soft" />
        <TextField label="Elevated" variant="elevated" defaultValue="Raised" />
        <TextField label="Filled" variant="filled" defaultValue="Strong" />
        <TextField label="Disabled" disabled defaultValue="Locked" />
      </div>
      <div style={{ alignSelf: 'stretch' }}>
        <TextField label="Address" multiline minLines={3} defaultValue="Rue Larbi Ben M'hidi, Oran" />
      </div>
    </>
  ),
  sliders: () => (
    <>
      <Slider label="Volume" defaultValue={40} />
      <Slider label="Discount" controlSize="compact" defaultValue={50} step={25} showStops />
      <div style={{ alignSelf: 'stretch' }}>
        <Slider
          label="Rating"
          trackStyle="thin"
          min={1}
          max={5}
          defaultValue={4}
          marks={[1, 2, 3, 4, 5].map((value) => ({ value, label: String(value) }))}
        />
      </div>
      <div className="row">
        <SlideSwitch label="Notifications" defaultChecked />
        <SlideSwitch label="SMS" />
        <SlideSwitch label="Auto confirm" defaultChecked onText="On" offText="Off" />
        <SlideSwitch label="Auto ship" onText="On" offText="Off" />
        <SlideSwitch label="Compact" controlSize="compact" defaultChecked />
        <SlideSwitch label="Disabled" disabled defaultChecked />
        <SlideSwitch label="Thin" trackStyle="thin" defaultChecked />
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
