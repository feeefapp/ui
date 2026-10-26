import { useState } from 'react'
import { ModelLadder, type LadderStop } from '@feeef.dev/ui/model-ladder'

const STOPS: LadderStop[] = [
  { modelId: 'imagen-fast', modelName: 'Imagen Fast', label: 'Draft', access: 'free' },
  { modelId: 'imagen-standard', modelName: 'Imagen', label: 'Standard', access: 'pro', priceUsd: 0.04 },
  { modelId: 'gpt-image-high', modelName: 'GPT Image', label: 'Studio', access: 'pro', priceUsd: 0.17 },
]

export default function Icon() {
  const [index, setIndex] = useState(1)
  const [generating, setGenerating] = useState(false)
  return (
    <div className="demo-row">
      <ModelLadder
        variant="icon"
        stops={STOPS}
        index={index}
        defaultIndex={1}
        onChange={setIndex}
        enabled={!generating}
        canvas={{ size: '1024 × 1536', aspect: '2:3', widthOverHeight: 2 / 3 }}
        side="bottom"
      />
      <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
        <input type="checkbox" checked={generating} onChange={(e) => setGenerating(e.target.checked)} />
        Generating
      </label>
    </div>
  )
}

export const meta = {
  title: 'Icon trigger',
  description:
    'variant="icon" fits a composer or toolbar. canvas adds a size readout; enabled={false} locks the choice while a request runs.',
}
