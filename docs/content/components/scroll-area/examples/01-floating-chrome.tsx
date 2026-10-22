import { useState } from 'react'
import { Plus } from 'lucide-react'
import { LabScrollArea } from '@feeef.dev/ui/scroll'
import { LabToolbarGroup } from '@feeef.dev/ui/toolbar'
import { LabToolbarSearch } from '@feeef.dev/ui/toolbar-search'
import { LabDock } from '@feeef.dev/ui/dock'
import { LabButton } from '@feeef.dev/ui/primitives/button'
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
      <LabScrollArea
        label="Products"
        top={
          <LabToolbarSearch
            label="Search products"
            value={query}
            onValueChange={setQuery}
            trailing={
              <LabToolbarGroup label="Product count">
                <span style={{ paddingInline: 12, fontSize: 13, whiteSpace: 'nowrap' }}>
                  {rows.length} products
                </span>
              </LabToolbarGroup>
            }
          />
        }
        bottom={
          <LabDock label="Product actions">
            <LabButton variant="filled">
              <Plus />
              Add product
            </LabButton>
          </LabDock>
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
      </LabScrollArea>
    </div>
  )
}

export const meta = {
  title: 'Floating search and dock',
  description:
    'The search and dock float over the content. Their measured heights become padding, so the first and last rows scroll fully clear of them.',
}
