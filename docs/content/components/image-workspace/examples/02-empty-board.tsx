import { useState } from 'react'
import { FreeformBoard } from '@feeef.dev/ui/image/freeform-board'
import { Button } from '@feeef.dev/ui/ui'

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
          starters={[]}
          onStarter={setPrompt}
          onRetry={() => {}}
          onRemove={() => {}}
          emptyScene={{
            maxWidth: 360,
            content: (
              <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 8 }}>
                {STARTERS.map((starter) => (
                  <Button key={starter.label} variant="tonal" onClick={() => setPrompt(starter.prompt)}>
                    {starter.label}
                  </Button>
                ))}
              </div>
            ),
          }}
        />
      </div>
      <small>{prompt ? `Starter: ${prompt}` : 'Pick a starter.'}</small>
    </div>
  )
}

export const meta = {
  title: 'Empty board',
  description:
    'Starter actions in an empty scene pan and zoom with the board. Click an action to select a prompt.',
}
