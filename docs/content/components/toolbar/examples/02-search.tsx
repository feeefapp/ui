import { useState } from 'react'
import { LayoutGrid, List, SlidersHorizontal } from 'lucide-react'
import { LabToolbarGroup } from '@feeef.dev/ui/toolbar'
import { LabToolbarSearch } from '@feeef.dev/ui/toolbar-search'
import { LabIconButton } from '@feeef.dev/ui/primitives/button'
import '../toolbar-demo.css'

const PRODUCTS = ['Wireless earbuds', 'Phone case', 'Smart watch', 'Power bank', 'USB-C cable', 'Desk lamp']

export default function Search() {
  const [query, setQuery] = useState('')
  const [grid, setGrid] = useState(true)
  const rows = PRODUCTS.filter((name) => name.toLowerCase().includes(query.toLowerCase()))
  return (
    <div className="toolbar-demo-surface">
      <LabToolbarSearch
        label="Search products"
        placeholder="Search by name or SKU"
        value={query}
        onValueChange={setQuery}
        // Always visible after the search.
        trailing={
          <LabToolbarGroup label="View">
            <LabIconButton
              variant="text"
              appearance="toolbar"
              controlSize="compact"
              aria-label={grid ? 'Show as list' : 'Show as grid'}
              onClick={() => setGrid(!grid)}
            >
              {grid ? <List /> : <LayoutGrid />}
            </LabIconButton>
          </LabToolbarGroup>
        }
      >
        {/* Children sit beside the closed search button and hide while the field is open. */}
        <LabToolbarGroup label="Filters">
          <LabIconButton variant="text" appearance="toolbar" controlSize="compact" aria-label="Filters">
            <SlidersHorizontal />
          </LabIconButton>
        </LabToolbarGroup>
      </LabToolbarSearch>
      <div className="toolbar-demo-content" style={grid ? undefined : { gridTemplateColumns: '1fr' }}>
        {rows.map((name) => (
          <div key={name}>
            {name}
            <small>In stock</small>
          </div>
        ))}
      </div>
    </div>
  )
}

export const meta = {
  title: 'Expanding search',
  description:
    'LabToolbarSearch is a search button that springs open into a field in the same pill, across the width of its row. Use it directly as a row rather than inside LabToolbar’s leading slot. children sit beside the closed button; trailing is always visible. Escape closes and clears.',
}
