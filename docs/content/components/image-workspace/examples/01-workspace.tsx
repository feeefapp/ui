import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import { LabImageWorkspace } from '@feeef.dev/ui/image/workspace'
import { FreeformBoard } from '@feeef.dev/ui/image/freeform-board'
import type { ImageTake } from '@feeef.dev/ui/image/types'
import { LabPromptComposer } from '@feeef.dev/ui/composer/composer'
import { LabGlassGroup } from '@feeef.dev/ui/scaffold'
import { LabIconButton } from '@feeef.dev/ui/primitives/button'

const art = (w: number, h: number, fill: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#e8eae4"/><circle cx="${w / 2}" cy="${h / 2}" r="${Math.min(w, h) / 3}" fill="${fill}"/></svg>`
  )}`

const take = (id: string, status: ImageTake['status'], aspectRatio: string, url = ''): ImageTake => ({
  id,
  operation: 'generate',
  parentTakeId: null,
  status,
  error: status === 'failed' ? 'The model did not return an image.' : null,
  createdAt: new Date().toISOString(),
  starred: false,
  prompt: 'A ceramic vase on linen, soft window light',
  model: 'imagen-standard',
  options: { aspectRatio },
  referenceCount: 0,
  hasMask: false,
  chargeDzd: null,
  chargeUsd: null,
  kind: 'image',
  copy: null,
  fileUrl: url,
  thumbUrl: url,
})

// Newest first.
const TAKES: ImageTake[] = [
  take('take-3', 'processing', '1:1'),
  take('take-2', 'completed', '4:5', art(800, 1000, '#6f8965')),
  take('take-1', 'completed', '1:1', art(1000, 1000, '#c08a5b')),
]

export default function Workspace() {
  const [takes, setTakes] = useState(TAKES)
  const [selected, setSelected] = useState<string>()
  const [prompt, setPrompt] = useState('')
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  return (
    <div style={{ display: 'flex', width: '100%', height: 520, borderRadius: 12, overflow: 'hidden' }}>
      <LabImageWorkspace
        top={
          <LabGlassGroup style={{ display: 'inline-flex', padding: '8px 14px' }}>
            <strong>Vase campaign</strong>
          </LabGlassGroup>
        }
        bottom={
          <LabPromptComposer
            label="Describe a change"
            placeholder="Make the light warmer"
            value={prompt}
            onValueChange={setPrompt}
            onSubmit={() => setPrompt('')}
            submit={
              <LabIconButton type="submit" variant="filled" aria-label="Create image" disabled={!prompt.trim()}>
                <ArrowUp size={20} />
              </LabIconButton>
            }
          />
        }
        board={(insets) => (
          <FreeformBoard
            embedded
            takes={takes}
            selectedId={selected}
            onSelect={setSelected}
            insets={insets}
            now={now}
            signedIn
            starters={[]}
            onStarter={setPrompt}
            onRetry={() => {}}
            onRemove={(removed) => setTakes((old) => old.filter((t) => t.id !== removed.id))}
          />
        )}
      />
    </div>
  )
}

export const meta = {
  title: 'Workspace with versions',
  description:
    'The board fits the selected version between the floating header and composer. Drag to pan, Ctrl or ⌘ + scroll to zoom, click a card to select it, double-click to fit it.',
}
