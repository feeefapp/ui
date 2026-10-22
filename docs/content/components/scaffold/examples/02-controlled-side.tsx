import { useState } from 'react'
import { Package, ShoppingBag, Truck } from 'lucide-react'
import {
  LabScaffold,
  LabScaffoldSide,
  LabScaffoldToggleButton,
  type LabScaffoldSideMode,
} from '@feeef.dev/ui/workspace/scaffold'
import { LabNavigationItem } from '@feeef.dev/ui/navigation/navigation-item'
import { LabSegmentedControl } from '@feeef.dev/ui/primitives/segmented'
import '../scaffold-demo.css'

const PAGES = [
  { label: 'Orders', icon: <ShoppingBag /> },
  { label: 'Products', icon: <Package /> },
  { label: 'Deliveries', icon: <Truck /> },
]

export default function ControlledSide() {
  // Keep the mode in your own state (or a saved preference) and let the scaffold report changes.
  const [mode, setMode] = useState<LabScaffoldSideMode>('rail')
  const [changes, setChanges] = useState(0)

  return (
    <div className="scaffold-demo-stack">
      <LabSegmentedControl
        label="Sidebar mode"
        value={mode}
        onChange={setMode}
        options={[
          { value: 'expanded', label: 'Expanded' },
          { value: 'rail', label: 'Rail' },
          { value: 'hidden', label: 'Hidden' },
        ]}
      />
      <div className="scaffold-demo-frame">
        <LabScaffold
          compactBreakpoint={420}
          sideMode={mode}
          onSideModeChange={(next) => {
            setMode(next)
            setChanges((count) => count + 1)
          }}
          side={(state) => (
            <LabScaffoldSide leading={<LabScaffoldToggleButton />}>
              <nav aria-label="Store pages" className="scaffold-demo-nav">
                {PAGES.map((item, index) => (
                  <LabNavigationItem
                    key={item.label}
                    compact={state.sideMode === 'rail' && !state.drawerOpen}
                    label={item.label}
                    icon={item.icon}
                    active={index === 0}
                  />
                ))}
              </nav>
            </LabScaffoldSide>
          )}
        >
          <div className="scaffold-demo-list">
            <h3>Orders</h3>
            <p>
              The sidebar is {mode}. The toggle inside it changed the mode {changes}{' '}
              {changes === 1 ? 'time' : 'times'}.
            </p>
          </div>
        </LabScaffold>
      </div>
    </div>
  )
}

export const meta = {
  title: 'Controlled sidebar mode',
  description:
    'Pass sideMode and onSideModeChange to own the mode, for example to save it as a user preference.',
}
