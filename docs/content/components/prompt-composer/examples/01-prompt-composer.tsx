import { useState } from 'react'
import { ArrowUp, Paperclip } from 'lucide-react'
import { LabPromptComposer } from '@feeef.dev/ui/composer/composer'
import { ModelLadder, type LadderStop } from '@feeef.dev/ui/model-ladder'
import { LabIconButton } from '@feeef.dev/ui/primitives/button'

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
      <LabPromptComposer
        label="Message"
        placeholder="Ask about your orders, products or customers"
        value={prompt}
        onValueChange={setPrompt}
        onSubmit={send}
        busy={busy}
        maxLength={4000}
        tools={
          <>
            <LabIconButton variant="ghost" appearance="toolbar" aria-label="Attach a file">
              <Paperclip size={18} />
            </LabIconButton>
            <ModelLadder variant="icon" stops={STOPS} index={model} defaultIndex={1} onChange={setModel} />
          </>
        }
        submit={
          <LabIconButton
            type="submit"
            variant="filled"
            aria-label="Send message"
            disabled={!prompt.trim()}
            loading={busy}
          >
            <ArrowUp size={20} />
          </LabIconButton>
        }
        footer={sent && <p style={{ margin: '8px 4px 0', color: 'var(--lab-muted)' }}>Sent: {sent}</p>}
      />
    </div>
  )
}

export const meta = {
  title: 'Prompt composer',
  description:
    'One line until the text needs room, then the field takes the top row and the tools move below. Enter sends; Shift+Enter adds a line.',
}
