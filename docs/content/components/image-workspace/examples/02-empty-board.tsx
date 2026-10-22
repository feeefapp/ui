import { useState } from 'react'
import { FreeformBoard } from '@feeef.dev/ui/image/freeform-board'

const STARTERS = [
  { label: 'Product on marble', prompt: 'A perfume bottle on white marble, soft studio light' },
  { label: 'Flat lay', prompt: 'A flat lay of skincare products on a pastel background' },
]

export default function EmptyBoard() {
  const [prompt, setPrompt] = useState('')
  return (
    <div className="demo-wide" style={{ display: 'grid', gap: 8 }}>
      <div style={{ position: 'relative', height: 320, borderRadius: 12, overflow: 'hidden' }}>
        <FreeformBoard
          embedded
          takes={[]}
          selectedId={undefined}
          onSelect={() => {}}
          insets={{ top: 12, right: 12, bottom: 12, left: 12 }}
          now={Date.now()}
          signedIn
          starters={STARTERS}
          onStarter={setPrompt}
          onRetry={() => {}}
          onRemove={() => {}}
        />
      </div>
      <small>{prompt ? `Starter: ${prompt}` : 'Pick a starter.'}</small>
    </div>
  )
}

export const meta = {
  title: 'Empty board',
  description:
    'With no versions the board shows a welcome and starter prompts. Pass emptyContent to replace it, as poster mode does with its template gallery.',
}
