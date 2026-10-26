import { PixelShader } from '@feeef.dev/ui/pixel-art'
import { Button } from '@feeef.dev/ui/primitives/button'

export default function ShaderBackground() {
  return (
    <section
      className="demo-wide"
      style={{
        position: 'relative',
        isolation: 'isolate',
        overflow: 'hidden',
        display: 'grid',
        gap: 12,
        justifyItems: 'start',
        padding: 32,
        minHeight: 220,
        border: '1px solid var(--lab-line)',
        borderRadius: 'var(--lab-radius-panel)',
        background: 'var(--lab-surface)',
      }}
    >
      <PixelShader
        density={0.9}
        speed={0.25}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: -1 }}
      />
      <h3 style={{ margin: 0 }}>Turn a script into a voiceover</h3>
      <p style={{ margin: 0, maxWidth: 360 }}>Write it once, pick a voice, and download the audio.</p>
      <Button variant="filled">Start a project</Button>
    </section>
  )
}

export const meta = {
  title: 'Ambient background',
  description:
    'PixelShader fills a hero or empty state with a slow pixel field. It pauses off screen and stays still under reduced motion.',
}
