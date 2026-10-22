import { Heart, Share } from 'lucide-react'
import {
  LabNavigationPage,
  LabNavigationStack,
  useLabNavigationPath,
} from '@feeef.dev/ui/containers'
import { LabListRow, LabListSection } from '@feeef.dev/ui/primitives/list'
import { LabButton, LabIconButton } from '@feeef.dev/ui/primitives/button'
import { LabToolbarGroup } from '@feeef.dev/ui/toolbar'
import { LabDock } from '@feeef.dev/ui/dock'
import { Device } from '../../../../src/blocks/device'
import '../stack-demo.css'

const PRODUCTS = [
  { id: 'kaftan', name: 'Linen kaftan', price: '6 800 DA', hue: 28 },
  { id: 'babouche', name: 'Leather babouches', price: '3 200 DA', hue: 12 },
  { id: 'tote', name: 'Woven tote', price: '2 400 DA', hue: 48 },
  { id: 'scarf', name: 'Silk scarf', price: '1 900 DA', hue: 330 },
  { id: 'mug', name: 'Clay mug set', price: '2 100 DA', hue: 190 },
  { id: 'lamp', name: 'Brass lamp', price: '9 500 DA', hue: 40 },
]
const art = (hue: number) => ({
  background: `linear-gradient(135deg, hsl(${hue} 70% 72%), hsl(${hue + 40} 55% 46%))`,
})

export default function ZoomGallery() {
  const nav = useLabNavigationPath<string>()
  return (
    <Device label="A phone showing a product gallery with zoom transitions">
      <LabNavigationStack label="Products" onBack={() => nav.pop()}>
        <LabNavigationPage key="products" title="Products" subtitle="Tap a product. Drag its page down to put it back.">
          <div className="stack-demo-grid">
            {PRODUCTS.map((product) => (
              <button
                key={product.id}
                type="button"
                className="stack-demo-card"
                onClick={() => nav.push(product.id)}
              >
                {/* The page zooms out of this element and shrinks back into it. */}
                <span className="stack-demo-art" style={art(product.hue)} data-lab-zoom-source={product.id} />
                <span className="stack-demo-card-name">{product.name}</span>
                <span className="stack-demo-card-price">{product.price}</span>
              </button>
            ))}
          </div>
        </LabNavigationPage>

        {nav.path.map((id) => {
          const product = PRODUCTS.find((p) => p.id === id)!
          return (
            <LabNavigationPage
              key={id}
              title={product.name}
              zoomSource={id}
              contentPadding={0}
              trailing={
                <LabToolbarGroup label="Product actions">
                  <LabIconButton variant="text" appearance="toolbar" aria-label="Save">
                    <Heart />
                  </LabIconButton>
                  <LabIconButton variant="text" appearance="toolbar" aria-label="Share">
                    <Share />
                  </LabIconButton>
                </LabToolbarGroup>
              }
              bottom={
                <LabDock label="Buy">
                  <LabButton variant="filled">Order · {product.price}</LabButton>
                </LabDock>
              }
            >
              <div className="stack-demo-hero" style={art(product.hue)} />
              <div className="stack-demo-body">
                <h2>{product.name}</h2>
                <p>
                  Handmade in small batches. Cash on delivery to all 58 wilayas, delivered in two to
                  four days.
                </p>
                <LabListSection header="Details">
                  <LabListRow static title="Price" trailing={product.price} />
                  <LabListRow static title="In stock" trailing="14" />
                  <LabListRow static title="Delivery" trailing="2–4 days" />
                </LabListSection>
              </div>
            </LabNavigationPage>
          )
        })}
      </LabNavigationStack>
    </Device>
  )
}

export const meta = {
  title: 'Zoom from a card',
  description:
    'zoomSource names an element on the page below (data-lab-zoom-source). The page grows out of it, and drags down (or swipes right) to shrink back into it, following the finger.',
}
