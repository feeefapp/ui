import { useState } from 'react'
import { Plus } from 'lucide-react'
import { PromptComposer } from '@feeef.dev/ui/composer/composer'
import { ModelLadder, type LadderStop } from '@feeef.dev/ui/model-ladder'
import { IconButton } from '@feeef.dev/ui/primitives/button'

const STOPS: LadderStop[] = [
  { modelId: 'gemini-flash-lite', modelName: 'Gemini Flash Lite', label: 'Fast', access: 'free' },
  { modelId: 'gemini-pro', modelName: 'Gemini Pro', label: 'Smart', access: 'pro' },
  { modelId: 'claude-opus', modelName: 'Claude Opus', label: 'Best', access: 'pro' },
]

export default function PromptComposerDemo() {
  const [prompt, setPrompt] = useState('')
  const [model, setModel] = useState(1)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState<string | null>(null)
  const send = () => {
    setBusy(true)
    setTimeout(() => {
      setSent(prompt)
      setPrompt('')
      setBusy(false)
    }, 1200)
  }
  return (
    <div className="demo-wide">
      <PromptComposer
        label="Message"
        placeholder="Ask about your orders, products or customers"
        value={prompt}
        onValueChange={setPrompt}
        onSubmit={send}
        busy={busy}
        submitLabel="Send message"
        maxLength={4000}
        leading={
          <IconButton variant="ghost" appearance="toolbar" aria-label="Attach a file">
            <Plus />
          </IconButton>
        }
        tools={<ModelLadder variant="compact" stops={STOPS} index={model} defaultIndex={1} onChange={setModel} />}
        footer={sent && <p style={{ margin: '0 4px', color: 'var(--lab-muted)' }}>Sent: {sent}</p>}
      />
    </div>
  )
}

export const meta = {
  title: 'Prompt composer',
  description:
    'One calm line until you type or focus it; then the model chip appears on a second row and send moves under the text. Enter sends; Shift+Enter adds a line.',
}
