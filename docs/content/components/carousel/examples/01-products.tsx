import { LabCarousel } from '@feeef.dev/ui/containers'
import '../carousel-demo.css'

const PRODUCTS = [
  { name: 'Linen kaftan', price: '6 800 DA', hue: 28 },
  { name: 'Leather babouches', price: '3 200 DA', hue: 12 },
  { name: 'Woven tote', price: '2 400 DA', hue: 48 },
  { name: 'Silk scarf', price: '1 900 DA', hue: 330 },
  { name: 'Clay mug set', price: '2 100 DA', hue: 190 },
]

export default function ProductCarousel() {
  return (
    <div className="cd-wide">
      <LabCarousel label="Featured products" slideWidth={0.62}>
        {PRODUCTS.map((p) => (
          <div key={p.name} className="cd-card">
            <div className="cd-art" style={{ background: `linear-gradient(135deg, hsl(${p.hue} 70% 72%), hsl(${p.hue + 40} 55% 46%))` }} />
            <strong>{p.name}</strong>
            <span>{p.price}</span>
          </div>
        ))}
      </LabCarousel>
    </div>
  )
}

export const meta = {
  title: 'Featured products',
  description:
    'Slides shrink slightly as they leave the center (effect="scale"). Swipe or scroll sideways, drag with the mouse, use the arrows on hover, the dots or the arrow keys.',
}
