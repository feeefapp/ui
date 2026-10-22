import { useState } from 'react'
import { ModelLadderCard, type LadderStop } from '@feeef.dev/ui/model-ladder'

const STOPS: LadderStop[] = [
  { modelId: 'flux-schnell', modelName: 'FLUX Schnell', label: 'Fast', access: 'free' },
  { modelId: 'imagen-standard', modelName: 'Imagen', label: 'Balanced', access: 'pro', priceUsd: 0.04 },
  { modelId: 'gpt-image-high', modelName: 'GPT Image', label: 'Best', access: 'pro', priceUsd: 0.17 },
]
const CATALOG: LadderStop[] = [
  ...STOPS,
  { modelId: 'flux-pro', modelName: 'FLUX Pro', label: 'FLUX Pro', description: 'Sharp product shots', access: 'pro' },
  { modelId: 'ideogram-v3', modelName: 'Ideogram 3', label: 'Ideogram 3', description: 'Text in images', access: 'pro' },
  { modelId: 'recraft-v3', modelName: 'Recraft V3', label: 'Recraft V3', description: 'Vector and brand art', access: 'pro' },
  { modelId: 'seedream-4', modelName: 'Seedream 4', label: 'Seedream 4', description: 'Photoreal scenes', access: 'pro' },
]

export default function CardWithCatalog() {
  const [index, setIndex] = useState(1)
  const [specific, setSpecific] = useState<LadderStop>()
  return (
    <div style={{ width: 'min(100%, 340px)' }}>
      <ModelLadderCard
        stops={STOPS}
        index={index}
        defaultIndex={1}
        onChange={(next) => {
          setSpecific(undefined)
          setIndex(next)
        }}
        catalog={CATALOG}
        selectedModel={specific}
        onPickModel={(id) => setSpecific(CATALOG.find((model) => model.modelId === id))}
        canvas={{ size: '1024 × 1024', aspect: '1:1', widthOverHeight: 1 }}
      />
    </div>
  )
}

export const meta = {
  title: 'Card with a full catalog',
  description:
    'ModelLadderCard sits in an inspector. Click the title for every model; with more than six, the list gets a search field. A model off the ladder hides the track until you reset.',
}
