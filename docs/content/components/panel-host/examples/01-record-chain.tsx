import { useState } from 'react'
import { Pencil, UserRound } from 'lucide-react'
import { Panel, PanelHost, usePanelStack, type PanelEntry } from '@feeef.dev/ui/containers'
import { Button, IconButton } from '@feeef.dev/ui/primitives/button'
import { ListRow, ListSection } from '@feeef.dev/ui/primitives/list'
import { TextField } from '@feeef.dev/ui/primitives/text-field'
import { ToolbarGroup } from '@feeef.dev/ui/toolbar'
import { FloatingBoundary } from '@feeef.dev/ui/menu'

function AppDetails({ name = 'Feeef lite', id = 'app:feeef-lite' }: { name?: string; id?: string }) {
  const stack = usePanelStack()
  const [editing, setEditing] = useState(false)
  const [note, setNote] = useState('Keep this unsaved note while opening the owner.')
  return (
    <Panel label={name} title="OAuth app" trailing={
      <ToolbarGroup label="App tools">
        <IconButton variant="text" appearance="toolbar" aria-label="Edit app" onClick={() => setEditing(!editing)}>
          <Pencil size={18} />
        </IconButton>
      </ToolbarGroup>
    }>
      <h2>{name}</h2>
      <p>Confidential client · On</p>
      <ListSection header="Details">
        <ListRow title="Owner" subtitle="mohamad" leading={<UserRound size={18} />} onClick={() => {
          void stack.push({ id: 'owner:mohamad', minWidth: 220, preferredWidth: 300, panel: <OwnerDetails /> }, id)
        }} />
        <ListRow title="Created" trailing="16 Aug 2026" />
        <ListRow title="Last used" trailing="Today" />
      </ListSection>
      <TextField hint="Unsaved note" value={note} onChange={event => setNote(event.target.value)} />
      {editing && <TextField hint="App name" defaultValue={name} />}
      <p>Open the owner, return, then change the preview width. Your draft stays here.</p>
    </Panel>
  )
}

function OwnerDetails() {
  return (
    <Panel label="App owner" title="Owner">
      <h2>mohamad</h2>
      <ListSection header="Account">
        <ListRow title="Status" trailing="Active" />
        <ListRow title="Account type" trailing="Merchant" />
      </ListSection>
      <p>This is a separate reusable surface, not a layout nested inside the app details.</p>
    </Panel>
  )
}

function Apps() {
  const stack = usePanelStack()
  return (
    <Panel label="Apps" title="Apps">
      <p>Apps that sign people in or call the API for them.</p>
      <ListSection>
        {['marketing', 'Unifunl.io', 'Feeef lite', 'feeef.dev'].map(name => (
          <ListRow key={name} title={name} subtitle="Confidential client" selected={stack.panels[1]?.id === `app:${name}`}
            onClick={() => { const id = `app:${name}`; void stack.push({ id, minWidth: 240, preferredWidth: 360, panel: <AppDetails name={name} id={id} /> }, 'apps') }} />
        ))}
      </ListSection>
    </Panel>
  )
}

export default function RecordChain() {
  const [panels, setPanels] = useState<readonly PanelEntry[]>([
    { id: 'apps', minWidth: 240, preferredWidth: 340, panel: <Apps /> },
  ])
  const [compact, setCompact] = useState(false)
  return (
    <div className="demo-column" style={{ width: '100%', minWidth: 0, gridTemplateColumns: 'minmax(0, 1fr)' }}>
      <Button variant="tonal" onClick={() => setCompact(!compact)}>{compact ? 'Use desktop width' : 'Use phone width'}</Button>
      <FloatingBoundary>
        <div style={{ width: compact ? 'min(390px, 100%)' : '100%', height: 560, position: 'relative' }}>
          <PanelHost panels={panels} onPanelsChange={setPanels} style={{ height: '100%' }} />
        </div>
      </FloatingBoundary>
    </div>
  )
}

export const meta = {
  title: 'Apps → app → owner',
  description: 'Open an app, then its owner. Each gets a desktop column or a new phone sheet. Edit and type a draft, switch widths, and close the top panel to verify state preservation.',
}
