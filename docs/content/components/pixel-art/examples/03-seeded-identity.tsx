import { PixelArtwork } from '@feeef.dev/ui/pixel-art'

const VOICES = [
  { id: 'voice_7f2a', name: 'Amina', style: 'Warm, conversational' },
  { id: 'voice_31c9', name: 'Yacine', style: 'Calm narrator' },
  { id: 'voice_b04e', name: 'Lina', style: 'Bright, energetic' },
]

export default function SeededIdentity() {
  return (
    <ul className="demo-column" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {VOICES.map((voice) => (
        <li key={voice.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <PixelArtwork variant="voice" seed={voice.id} size={40} />
          <span style={{ display: 'grid' }}>
            <strong>{voice.name}</strong>
            <small style={{ color: 'var(--lab-muted)' }}>{voice.style}</small>
          </span>
        </li>
      ))}
    </ul>
  )
}

export const meta = {
  title: 'Seeded identity',
  description:
    'Seed artwork with a stable record id. The same id draws the same fingerprint on every screen and every visit.',
}
