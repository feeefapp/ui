import { useState } from 'react'
import { LayoutGrid, List, SlidersHorizontal } from 'lucide-react'
import { ToolbarGroup } from '@feeef.dev/ui/toolbar'
import { ToolbarSearch } from '@feeef.dev/ui/toolbar-search'
import { IconButton } from '@feeef.dev/ui/primitives/button'
import '../toolbar-demo.css'

const PRODUCTS = ['Wireless earbuds', 'Phone case', 'Smart watch', 'Power bank', 'USB-C cable', 'Desk lamp']

export default function Search() {
  const [query, setQuery] = useState('')
  const [grid, setGrid] = useState(true)
  const rows = PRODUCTS.filter((name) => name.toLowerCase().includes(query.toLowerCase()))
  return (
    <div className="toolbar-demo-surface">
      <ToolbarSearch
        label="Search products"
        placeholder="Search by name or SKU"
        value={query}
        onValueChange={setQuery}
        // Always visible after the search.
        trailing={
          <ToolbarGroup label="View">
            <IconButton
              variant="text"
              appearance="toolbar"
              controlSize="compact"
              aria-label={grid ? 'Show as list' : 'Show as grid'}
              onClick={() => setGrid(!grid)}
            >
              {grid ? <List /> : <LayoutGrid />}
            </IconButton>
          </ToolbarGroup>
        }
      >
        {/* Children sit beside the closed search button and hide while the field is open. */}
        <ToolbarGroup label="Filters">
          <IconButton variant="text" appearance="toolbar" controlSize="compact" aria-label="Filters">
            <SlidersHorizontal />
          </IconButton>
        </ToolbarGroup>
      </ToolbarSearch>
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
    'ToolbarSearch is a search button that springs open into a field in the same pill, across the width of its row. Use it directly as a row rather than inside Toolbar’s leading slot. children sit beside the closed button; trailing is always visible. Escape closes and clears.',
}
