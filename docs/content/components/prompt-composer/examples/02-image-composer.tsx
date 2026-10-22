import { useState } from 'react'
import { PromptComposer, type ComposerReference } from '@feeef.dev/ui/image/prompt-composer'
import { ModelLadder, type LadderStop } from '@feeef.dev/ui/model-ladder'
import { LabSegmentedControl } from '@feeef.dev/ui/primitives/segmented'

const STOPS: LadderStop[] = [
  { modelId: 'flux-schnell', modelName: 'FLUX Schnell', label: 'Fast', access: 'free' },
  { modelId: 'imagen-standard', modelName: 'Imagen', label: 'Balanced', access: 'pro' },
  { modelId: 'gpt-image-high', modelName: 'GPT Image', label: 'Best', access: 'pro' },
]
const TEMPLATES = [
  { id: 'studio', name: 'Studio shot', prompt: 'The product on a seamless beige backdrop, soft daylight, 50mm.' },
  { id: 'lifestyle', name: 'Lifestyle', prompt: 'The product on a kitchen counter in morning light, shallow depth of field.' },
]
const PHOTO = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" fill="#e8eae4"/><rect x="26" y="18" width="28" height="44" rx="6" fill="#6f8965"/></svg>'
)}`

type Shape = '1:1' | '4:5' | '16:9'

export default function ImageComposer() {
  const [prompt, setPrompt] = useState('')
  const [model, setModel] = useState(1)
  const [shape, setShape] = useState<Shape>('1:1')
  const [references, setReferences] = useState<ComposerReference[]>([
    { id: 'bottle', name: 'Bottle front', url: PHOTO },
  ])
  const [submitting, setSubmitting] = useState(false)
  const addFiles = (files: File[]) =>
    setReferences((old) =>
      [...old, ...files.map((file) => ({ id: `${file.name}-${file.size}`, name: file.name, url: URL.createObjectURL(file) }))].slice(0, 3)
    )
  return (
    <div className="demo-wide" style={{ paddingTop: 72 }}>
      <PromptComposer
        mode="image"
        prompt={prompt}
        onPrompt={setPrompt}
        placeholder="Describe the image you want"
        maxLength={2000}
        references={references}
        referenceLimit={{ max: 3, formats: ['image/png', 'image/jpeg', 'image/webp'] }}
        onAddFiles={addFiles}
        onRemoveReference={(id) => setReferences((old) => old.filter((ref) => ref.id !== id))}
        recent={[]}
        onUseRecent={() => {}}
        onEditPhoto={(file) => addFiles([file])}
        templates={TEMPLATES}
        onTemplate={(template) => setPrompt(template.prompt)}
        ladder={(variant) => (
          <ModelLadder variant={variant} stops={STOPS} index={model} defaultIndex={1} onChange={setModel} />
        )}
        settingsLabel={shape}
        settings={
          <LabSegmentedControl
            label="Shape"
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
    'The Lab image composer: references above the card, a + menu (upload, paste, ideas, edit a photo), model ladder, output settings, AI wand and send.',
}
