import { useState } from 'react'
import { ModelLadder, middleIndex, type LadderStop } from '@feeef.dev/ui/model-ladder'

const STOPS: LadderStop[] = [
  { modelId: 'google/gemini-flash-lite', modelName: 'Gemini Flash Lite', label: 'Fast', access: 'free' },
  { modelId: 'openai/gpt-4.1-mini', modelName: 'GPT-4.1 mini', label: 'Everyday', access: 'free' },
  { modelId: 'google/gemini-pro', modelName: 'Gemini Pro', label: 'Smart', access: 'pro', priceUsd: 0.012 },
  { modelId: 'anthropic/claude-opus', modelName: 'Claude Opus', label: 'Best', access: 'pro', priceUsd: 0.08 },
]
const DEFAULT = middleIndex(STOPS.length)

export default function Chip() {
  const [index, setIndex] = useState(DEFAULT)
  return (
    <div className="demo-column" style={{ justifyItems: 'center' }}>
      <ModelLadder stops={STOPS} index={index} defaultIndex={DEFAULT} onChange={setIndex} side="bottom" />
      <small>Requests use {STOPS[index].modelId}</small>
    </div>
  )
}

export const meta = {
  title: 'Chip trigger',
  description:
    'The chip shows the tier and the model name. Open it and drag, click a stop or use the arrow keys; the top rung lights up.',
}
