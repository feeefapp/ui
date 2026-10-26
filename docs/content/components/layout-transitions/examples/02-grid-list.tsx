import { useState } from 'react'
import { LayoutGrid, List } from 'lucide-react'
import { LayoutGroup } from '@feeef.dev/ui/physics'
import { GlassScope } from '@feeef.dev/ui/glass'
import { SegmentedControl } from '@feeef.dev/ui/primitives/segmented'
import { ToolbarGroup } from '@feeef.dev/ui/toolbar'
import '../layout-demo.css'

const PRODUCTS = [
  { id: 'kaftan', name: 'Linen kaftan', hue: 28 },
  { id: 'babouche', name: 'Leather babouches', hue: 12 },
  { id: 'tote', name: 'Woven tote', hue: 48 },
  { id: 'scarf', name: 'Silk scarf', hue: 330 },
  { id: 'mug', name: 'Clay mug set', hue: 190 },
  { id: 'lamp', name: 'Brass lamp', hue: 40 },
]

export default function GridOrList() {
  const [view, setView] = useState<'grid' | 'list'>('grid')
  return (
    <div className="lt-demo">
      <GlassScope>
        <ToolbarGroup label="View">
          <SegmentedControl
            label="View"
            value={view}
            onChange={setView}
            options={[
              { value: 'grid', label: 'Grid', icon: <LayoutGrid size={16} /> },
              { value: 'list', label: 'List', icon: <List size={16} /> },
            ]}
          />
        </ToolbarGroup>
      </GlassScope>
      <LayoutGroup layoutKey={view}>
        <ul className="lt-products" data-view={view}>
          {PRODUCTS.map((p) => (
            <li key={p.id} className="lt-product">
              {/* data-lab-layout="size": the swatch grows and shrinks as well as moving. */}
              <span
                className="lt-swatch"
                data-lab-layout-id={`swatch-${p.id}`}
                data-lab-layout="size"
                style={{ background: `linear-gradient(135deg, hsl(${p.hue} 70% 72%), hsl(${p.hue + 40} 55% 46%))` }}
              />
              <span className="lt-product-name" data-lab-layout-id={`name-${p.id}`}>
                {p.name}
              </span>
            </li>
          ))}
        </ul>
      </LayoutGroup>
    </div>
  )
}

export const meta = {
  title: 'Grid to list',
  description:
    'Switching the view moves every swatch and name from its grid place to its list place. layoutKey limits the animation to view changes.',
}
