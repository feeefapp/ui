import { LabCarousel } from '@feeef.dev/ui/containers'
import '../carousel-demo.css'

export default function Shelf() {
  return (
    <div className="cd-wide">
      <LabCarousel label="Recent customers" slideWidth="150px" align="start" effect="none" dots={false} gap={10}>
        {['Amina', 'Yacine', 'Sara', 'Karim', 'Lina', 'Omar', 'Nour', 'Riad'].map((name, i) => (
          <div key={name} className="cd-card">
            <div className="cd-art" style={{ aspectRatio: 1, background: `hsl(${i * 40} 45% 70%)` }} />
            <strong>{name}</strong>
            <span>{3 + i} orders</span>
          </div>
        ))}
      </LabCarousel>
    </div>
  )
}

export const meta = {
  title: 'Shelf',
  description: 'Fixed-width slides aligned to the start with no effect or dots: a row of small cards like an App Store shelf.',
}
