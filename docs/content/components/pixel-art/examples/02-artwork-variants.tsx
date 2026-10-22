import { PixelArtwork } from '@feeef.dev/ui/pixel-art'

const VARIANTS = ['voice', 'wave', 'orbit', 'spark'] as const

export default function ArtworkVariants() {
  return (
    <div className="demo-row" style={{ gap: 32 }}>
      {VARIANTS.map((variant) => (
        <figure key={variant} style={{ display: 'grid', justifyItems: 'center', gap: 8, margin: 0 }}>
          <PixelArtwork variant={variant} seed="spring-collection" size={64} tone="sage" />
          <figcaption>
            <code>{variant}</code>
          </figcaption>
        </figure>
      ))}
    </div>
  )
}

export const meta = {
  title: 'Artwork variants',
  description:
    'Four motifs from one seed. voice keeps its own seeded colors; wave, orbit and spark take the tone.',
}
