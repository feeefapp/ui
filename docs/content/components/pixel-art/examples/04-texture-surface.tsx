import { useState } from 'react'
import { PixelArtwork, PixelTexture } from '@feeef.dev/ui/pixel-art'
import { SegmentedControl } from '@feeef.dev/ui/primitives/segmented'
import { Button } from '@feeef.dev/ui/primitives/button'

type Density = 'sparse' | 'medium' | 'dense'

export default function TextureSurface() {
  const [density, setDensity] = useState<Density>('sparse')
  return (
    <div className="demo-column">
      <SegmentedControl
        label="Texture density"
        value={density}
        onChange={setDensity}
        options={[
          { value: 'sparse', label: 'Sparse' },
          { value: 'medium', label: 'Medium' },
          { value: 'dense', label: 'Dense' },
        ]}
      />
      <article
        style={{
          position: 'relative',
          isolation: 'isolate',
          display: 'grid',
          gap: 8,
          padding: 20,
          border: '1px solid var(--lab-line)',
          borderRadius: 'var(--lab-radius-panel)',
          background: 'var(--lab-surface)',
        }}
      >
        <span
          aria-hidden="true"
          style={{ position: 'absolute', inset: 0, zIndex: -1, overflow: 'hidden', borderRadius: 'inherit' }}
        >
          <PixelTexture variant="corner" seed="project_aurora" density={density} />
        </span>
        <PixelArtwork variant="orbit" seed="project_aurora" size={40} tone="sage" />
        <strong>Aurora landing page</strong>
        <span style={{ color: 'var(--lab-muted)' }}>Edited 2 hours ago</span>
        <div>
          <Button variant="tonal" controlSize="small">
            Open project
          </Button>
        </div>
      </article>
    </div>
  )
}

export const meta = {
  title: 'Texture on a surface',
  description:
    'Put the texture in its own clipped layer behind the content, so the card and its focus ring stay unclipped.',
}
