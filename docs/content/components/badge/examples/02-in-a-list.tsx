import { ProBadge } from '@feeef.dev/ui/primitives/badge'

const FEATURES = [
  { name: 'Text to speech', pro: false },
  { name: 'Two speakers in one take', pro: false },
  { name: 'Voice cloning', pro: true },
  { name: 'Commercial use', pro: true },
]

export default function InAList() {
  return (
    <ul className="demo-column" style={{ listStyle: 'none', margin: 0, padding: 0, gap: 10 }}>
      {FEATURES.map((feature) => (
        <li key={feature.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {feature.name}
          {feature.pro && <ProBadge />}
        </li>
      ))}
    </ul>
  )
}

export const meta = {
  title: 'In a feature list',
  description: 'Mark only the paid rows; free rows need no badge.',
}
