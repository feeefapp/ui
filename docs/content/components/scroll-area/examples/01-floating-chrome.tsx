import { useState } from 'react'
import { Plus } from 'lucide-react'
import { ScrollArea } from '@feeef.dev/ui/scroll'
import { ToolbarGroup } from '@feeef.dev/ui/toolbar'
import { ToolbarSearch } from '@feeef.dev/ui/toolbar-search'
import { Dock } from '@feeef.dev/ui/dock'
import { Button } from '@feeef.dev/ui/primitives/button'
import '../scroll-demo.css'

const PRODUCTS = [
  'Wireless earbuds',
  'Phone case',
  'Smart watch',
  'Power bank 20 000 mAh',
  'USB-C cable',
  'Bluetooth speaker',
  'Laptop stand',
  'Desk lamp',
  'Car charger',
  'Ring light',
  'Gaming mouse',
  'Keyboard',
].map((name, i) => ({ name, price: `${(i + 2) * 850} DA`, stock: 40 - i * 3 }))

export default function FloatingChrome() {
  const [query, setQuery] = useState('')
  const rows = PRODUCTS.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
  return (
    <div className="scroll-demo-frame">
      <ScrollArea
        label="Products"
        top={
          <ToolbarSearch
            label="Search products"
            value={query}
            onValueChange={setQuery}
            trailing={
              <ToolbarGroup label="Product count">
                <span style={{ paddingInline: 12, fontSize: 13, whiteSpace: 'nowrap' }}>
                  {rows.length} products
                </span>
              </ToolbarGroup>
            }
          />
        }
        bottom={
          <Dock label="Product actions">
            <Button variant="filled">
              <Plus />
              Add product
            </Button>
          </Dock>
        }
      >
        <div className="scroll-demo-list">
          {rows.map((product) => (
            <div key={product.name} className="scroll-demo-row">
              <span>
                <strong>{product.name}</strong>
                <small>{product.stock} in stock</small>
              </span>
              <strong>{product.price}</strong>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

export const meta = {
  title: 'Floating search and dock',
  description:
    'The search and dock float over the content. Their measured heights become padding, so the first and last rows scroll fully clear of them.',
}
