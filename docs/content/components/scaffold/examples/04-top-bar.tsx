import { ArrowLeft, Package, ShoppingBag, Truck } from 'lucide-react'
import {
  LabScaffold,
  LabScaffoldSide,
  LabScaffoldToggleButton,
  LabScaffoldTopBar,
} from '@feeef.dev/ui/workspace/scaffold'
import { LabNavigationItem } from '@feeef.dev/ui/navigation/navigation-item'
import { LabToolbarGroup } from '@feeef.dev/ui/toolbar'
import { LabIconButton } from '@feeef.dev/ui/primitives/button'
import '../scaffold-demo.css'

const PAGES = [
  { label: 'Orders', icon: <ShoppingBag /> },
  { label: 'Products', icon: <Package /> },
  { label: 'Deliveries', icon: <Truck /> },
]

export default function TopBar() {
  return (
    <div className="scaffold-demo-frame">
      <LabScaffold
        compactBreakpoint={420}
        defaultSideMode="hidden"
        side={(state) => (
          <LabScaffoldSide leading={<LabScaffoldToggleButton />}>
            <nav aria-label="Store pages" className="scaffold-demo-nav">
              {PAGES.map((item, index) => (
                <LabNavigationItem
                  key={item.label}
                  compact={state.sideMode === 'rail' && !state.drawerOpen}
                  label={item.label}
                  icon={item.icon}
                  active={index === 1}
                />
              ))}
            </nav>
          </LabScaffoldSide>
        )}
        // The top row only appears while the sidebar is hidden, so its controls are never doubled.
        topSide={(state) =>
          state.sideMode === 'hidden' && (
            <LabScaffoldTopBar
              leading={
                <LabToolbarGroup label="Navigation">
                  <LabIconButton
                    variant="text"
                    appearance="toolbar"
                    controlSize="compact"
                    aria-label="Back to products"
                  >
                    <ArrowLeft className="lab-dir-flip" />
                  </LabIconButton>
                  <LabScaffoldToggleButton action="restore" />
                </LabToolbarGroup>
              }
            >
              <strong>Atlas Store</strong>
            </LabScaffoldTopBar>
          )
        }
      >
        <div className="scaffold-demo-list">
          <h3>Edit product</h3>
          <p>Focused editors start with the sidebar hidden. The top row brings it back.</p>
        </div>
      </LabScaffold>
    </div>
  )
}

export const meta = {
  title: 'Top row',
  description:
    'topSide is a full-width row above the sidebar and content. Show it when the sidebar is hidden to keep navigation reachable.',
}
