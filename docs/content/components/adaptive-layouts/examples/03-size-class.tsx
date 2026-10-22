import { useRef, useState } from 'react'
import { useSizeClass } from '@feeef.dev/ui/containers'
import { Slider } from '@feeef.dev/ui/primitives/slider'
import '../adaptive-demo.css'

function ProductCard() {
  const ref = useRef<HTMLDivElement>(null)
  const size = useSizeClass(ref, 420)
  return (
    <div ref={ref} className="ad-card" data-size={size}>
      <div className="ad-card-art" />
      <div>
        <strong>Linen kaftan</strong>
        <p>6 800 DA · {size} layout</p>
      </div>
    </div>
  )
}

export default function SizeClassCard() {
  const [width, setWidth] = useState(560)
  return (
    <div className="ad-demo">
      <Slider label="Width" min={240} max={640} value={width} onValueChange={setWidth} />
      <div className="ad-frame" style={{ width }}>
        <ProductCard />
      </div>
    </div>
  )
}

export const meta = {
  title: 'Size class',
  description:
    'useSizeClass measures the component, not the window: below 420px this card stacks its image over the text, whatever the screen size.',
}
