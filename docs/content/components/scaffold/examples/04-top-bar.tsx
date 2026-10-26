import { ArrowLeft, Package, ShoppingBag, Truck } from 'lucide-react'
import {
  Scaffold,
  ScaffoldSide,
  ScaffoldToggleButton,
  ScaffoldTopBar,
} from '@feeef.dev/ui/workspace/scaffold'
import { NavigationItem } from '@feeef.dev/ui/navigation/navigation-item'
import { ToolbarGroup } from '@feeef.dev/ui/toolbar'
import { IconButton } from '@feeef.dev/ui/primitives/button'
import '../scaffold-demo.css'

const PAGES = [
  { label: 'Orders', icon: <ShoppingBag /> },
  { label: 'Products', icon: <Package /> },
  { label: 'Deliveries', icon: <Truck /> },
]

export default function TopBar() {
  return (
    <div className="scaffold-demo-frame">
      <Scaffold
        compactBreakpoint={420}
        defaultSideMode="hidden"
        side={(state) => (
          <ScaffoldSide leading={<ScaffoldToggleButton />}>
            <nav aria-label="Store pages" className="scaffold-demo-nav">
              {PAGES.map((item, index) => (
                <NavigationItem
                  key={item.label}
                  compact={state.sideMode === 'rail' && !state.drawerOpen}
                  label={item.label}
                  icon={item.icon}
                  active={index === 1}
                />
              ))}
            </nav>
          </ScaffoldSide>
        )}
        // The top row only appears while the sidebar is hidden, so its controls are never doubled.
        topSide={(state) =>
          state.sideMode === 'hidden' && (
            <ScaffoldTopBar
              leading={
                <ToolbarGroup label="Navigation">
                  <IconButton
                    variant="text"
                    appearance="toolbar"
                    aria-label="Back to products"
                  >
                    <ArrowLeft className="lab-dir-flip" />
                  </IconButton>
                  <ScaffoldToggleButton action="restore" />
                </ToolbarGroup>
              }
            >
              <strong>Atlas Store</strong>
            </ScaffoldTopBar>
          )
        }
      >
        <div className="scaffold-demo-list">
          <h3>Edit product</h3>
          <p>Focused editors start with the sidebar hidden. The top row brings it back.</p>
        </div>
      </Scaffold>
    </div>
  )
}

export const meta = {
  title: 'Top row',
  description:
    'topSide is a full-width row above the sidebar and content. Show it when the sidebar is hidden to keep navigation reachable.',
}
