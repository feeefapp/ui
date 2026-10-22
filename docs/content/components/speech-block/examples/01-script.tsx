import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { SpeechBlock } from '@feeef.dev/ui/speech/block'
import { moveSpeechBlock } from '@feeef.dev/ui/speech/block-order'
import { PixelArtwork } from '@feeef.dev/ui/pixel-art'
import { RawInput } from '@feeef.dev/ui/primitives/raw-input'
import { IconButton } from '@feeef.dev/ui/primitives/button'

type Block = { id: string; speaker: string; text: string }

const INITIAL: Block[] = [
  { id: 'intro', speaker: 'Amina', text: 'Your order is on its way. Expect a call from the courier today.' },
  { id: 'reply', speaker: 'Yacine', text: 'Can I pay when it arrives?' },
  { id: 'close', speaker: 'Amina', text: 'Yes, cash on delivery. Thank you for shopping with us.' },
]

export default function Script() {
  const [blocks, setBlocks] = useState(INITIAL)
  const edit = (id: string, text: string) =>
    setBlocks((old) => old.map((block) => (block.id === id ? { ...block, text } : block)))
  return (
    <div className="demo-wide lab-voice-writing" style={{ display: 'grid', gap: 8 }}>
      {blocks.map((block, index) => (
        <SpeechBlock
          key={block.id}
          seed={block.id}
          index={index}
          count={blocks.length}
          onMove={(from, to) => setBlocks((old) => moveSpeechBlock(old, from, to))}
          toolbar={
            <>
              <PixelArtwork variant="voice" seed={block.speaker} size={24} />
              <strong style={{ flex: 1, fontSize: 13 }}>{block.speaker}</strong>
              <IconButton
                variant="ghost"
                appearance="toolbar"
                controlSize="compact"
                aria-label={`Delete block ${index + 1}`}
                disabled={blocks.length === 1}
                onClick={() => setBlocks((old) => old.filter((b) => b.id !== block.id))}
              >
                <Trash2 size={18} />
              </IconButton>
            </>
          }
        >
          <RawInput
            multiline
            className="lab-textarea"
            aria-label={`Speech for block ${index + 1}`}
            value={block.text}
            onValueChange={(text) => edit(block.id, text)}
            style={{ width: '100%', border: 0, background: 'transparent', padding: '4px 6px' }}
          />
        </SpeechBlock>
      ))}
    </div>
  )
}

export const meta = {
  title: 'Script with reorder',
  description:
    'Drag a block by its handle, or focus the handle and press the up and down arrows. moveSpeechBlock applies the move as one edit.',
}
