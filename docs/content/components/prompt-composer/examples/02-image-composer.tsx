import { useState } from 'react'
import { ImagePromptComposer, type ComposerReference } from '@feeef.dev/ui/image/prompt-composer'
import { ModelLadder, type LadderStop } from '@feeef.dev/ui/model-ladder'
import { SegmentedControl } from '@feeef.dev/ui/primitives/segmented'

const STOPS: LadderStop[] = [
  { modelId: 'flux-schnell', modelName: 'FLUX Schnell', label: 'Fast', access: 'free' },
  { modelId: 'imagen-standard', modelName: 'Imagen', label: 'Balanced', access: 'pro' },
  { modelId: 'gpt-image-high', modelName: 'GPT Image', label: 'Best', access: 'pro' },
]
const TEMPLATES = [
  { id: 'studio', name: 'Studio shot', prompt: 'The product on a seamless beige backdrop, soft daylight, 50mm.' },
  { id: 'lifestyle', name: 'Lifestyle', prompt: 'The product on a kitchen counter in morning light, shallow depth of field.' },
]
/** A product photo: a bottle on a pale ground. */
const photo = (ground: string, bottle: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" fill="${ground}"/><rect x="26" y="18" width="28" height="44" rx="6" fill="${bottle}"/></svg>`
  )}`
const RECENT = [
  { id: 'side', prompt: 'Bottle, side', thumbUrl: photo('#efe6da', '#b9824f') },
  { id: 'back', prompt: 'Bottle, back', thumbUrl: photo('#dfe8ee', '#4f7894') },
  { id: 'cap', prompt: 'Bottle cap', thumbUrl: photo('#ece3ee', '#8a5f96') },
]

type Shape = '1:1' | '4:5' | '16:9'

export default function ImageComposer() {
  const [prompt, setPrompt] = useState('')
  const [model, setModel] = useState(1)
  const [shape, setShape] = useState<Shape>('1:1')
  const [references, setReferences] = useState<ComposerReference[]>([
    { id: 'front', name: 'Bottle front', url: photo('#e8eae4', '#6f8965') },
  ])
  const [submitting, setSubmitting] = useState(false)
  const add = (added: ComposerReference[]) => setReferences((old) => [...old, ...added].slice(0, 4))
  return (
    <div className="demo-wide" style={{ paddingTop: 72 }}>
      <ImagePromptComposer
        mode="image"
        prompt={prompt}
        onPrompt={setPrompt}
        placeholder="Describe the image you want"
        maxLength={2000}
        references={references}
        referenceLimit={{ max: 4, formats: ['image/png', 'image/jpeg', 'image/webp'] }}
        onAddFiles={(files) =>
          add(files.map((file) => ({ id: `${file.name}-${file.size}`, name: file.name, url: URL.createObjectURL(file) })))
        }
        onRemoveReference={(id) => setReferences((old) => old.filter((ref) => ref.id !== id))}
        recent={RECENT.filter((image) => !references.some((ref) => ref.id === image.id))}
        onUseRecent={(id) => {
          const image = RECENT.find((recent) => recent.id === id)
          if (image) add([{ id, name: image.prompt, url: image.thumbUrl }])
        }}
        onEditPhoto={() => {}}
        templates={TEMPLATES}
        onTemplate={(template) => setPrompt(template.prompt)}
        ladder={<ModelLadder variant="compact" stops={STOPS} index={model} defaultIndex={1} onChange={setModel} />}
        settingsLabel={shape}
        settings={
          <SegmentedControl
            label="Shape"
            className="demo-segmented-box"
            value={shape}
            onChange={setShape}
            options={[
              { value: '1:1', label: 'Square' },
              { value: '4:5', label: 'Portrait' },
              { value: '16:9', label: 'Wide' },
            ]}
          />
        }
        enhancing=""
        onEnhance={(mode) => mode === 'ideas' && setPrompt(TEMPLATES[0].prompt)}
        onSubmit={() => {
          setSubmitting(true)
          setTimeout(() => setSubmitting(false), 1500)
        }}
        submitDisabled={!prompt.trim()}
        submitting={submitting}
        submitLabel="Create image"
        caption="About 4 DZD per image · 3 free today"
      />
    </div>
  )
}

export const meta = {
  title: 'Image studio composer',
  description:
    'References sit inside the capsule as thumbnails, the first marked Main. The + menu uploads, pastes, reuses your images (try it), starts from an idea or edits a photo. The model and output settings appear on the second row once you type.',
}
