import { LabCarousel } from '@feeef.dev/ui/containers'
import '../carousel-demo.css'

const BANNERS = [
  { title: 'Ramadan collection', text: 'Free delivery on orders over 5 000 DA', hue: 150 },
  { title: 'New in: brass lamps', text: 'Handmade in Constantine', hue: 38 },
  { title: 'Gift cards', text: 'From 1 000 DA', hue: 280 },
]

export default function Banners() {
  return (
    <div className="cd-wide">
      <LabCarousel label="Promotions" slideWidth={0.9} effect="parallax" gap={10}>
        {BANNERS.map((b) => (
          <div key={b.title} className="cd-banner">
            {/* Marked media drifts against the scroll. */}
            <div data-lab-parallax="" style={{ background: `linear-gradient(120deg, hsl(${b.hue} 55% 38%), hsl(${b.hue + 50} 60% 58%))` }} />
            <h4>{b.title}</h4>
            <p>{b.text}</p>
          </div>
        ))}
      </LabCarousel>
    </div>
  )
}

export const meta = {
  title: 'Parallax banners',
  description: 'effect="parallax": anything marked data-lab-parallax inside a slide drifts against the scroll, so the image seems deeper than the card.',
}
