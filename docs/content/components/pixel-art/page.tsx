import { PixelArtwork, PixelLoader, PixelTexture } from '@feeef.dev/ui/pixel-art'
import { definePage, examplesFrom } from '../../../src/model'
import { Playground, jsx } from '../../../src/blocks/playground'
import { Callout, DoDont, Section, Table } from '../../../src/blocks/prose'
import { C } from '../../../src/blocks/code'

const VARIANTS = ['voice', 'wave', 'orbit', 'spark'] as const
const TONES = ['ink', 'sage', 'inverse', 'muted'] as const

const controls = {
  variant: { type: 'select', options: VARIANTS, default: 'orbit' },
  seed: { type: 'text', default: 'spring-collection' },
  size: { type: 'number', min: 24, max: 160, step: 8, default: 96 },
  tone: { type: 'select', options: TONES, default: 'sage' },
  animated: { type: 'boolean', default: false },
} as const

function Overview() {
  return (
    <>
      <Playground
        controls={controls}
        render={(v) => (
          <PixelArtwork
            variant={v.variant as (typeof VARIANTS)[number]}
            seed={v.seed}
            size={v.size}
            tone={v.tone as (typeof TONES)[number]}
            animated={v.animated}
          />
        )}
        code={(v) =>
          jsx(
            'PixelArtwork',
            { variant: v.variant, seed: v.seed, size: v.size, tone: v.tone, animated: v.animated },
            undefined,
            { variant: 'voice', seed: 'feeef', size: 48, tone: 'ink' }
          )
        }
      />

      <Section title="Choosing a piece">
        <p>
          Pixel art is Feeef's visual signature. Four components share it, each with one job. All of
          them are decorative by default, so the page must read the same with every one removed.
        </p>
        <Table
          head={['Component', 'Use it for']}
          rows={[
            [<C>PixelLoader</C>, 'Work in progress: a nine-pixel wave that announces itself as a status.'],
            [<C>PixelArtwork</C>, 'Identity: a seeded motif for a voice, project or empty state.'],
            [<C>PixelTexture</C>, 'Surface paint: quiet pixels in a card or panel corner.'],
            [<C>PixelShader</C>, 'Ambient motion: an animated pixel field behind a hero or empty state.'],
          ]}
        />
      </Section>

      <Section title="Seeds">
        <p>
          <C>PixelArtwork</C> and <C>PixelTexture</C> take a <C>seed</C>. The same variant, seed and
          density always draw the same pixels, so pass a stable id (a voice id, a project id) and the
          artwork becomes recognizable across screens. Never seed with <C>Math.random()</C> or change
          the seed on hover. Seeds give visual identity, not uniqueness: two ids can look alike.
        </p>
      </Section>

      <Section title="Artwork">
        <p>
          <C>variant</C> picks the motif: <C>voice</C> is a multicolor fingerprint with its own seeded
          palette (it ignores <C>tone</C>), <C>wave</C> is a band twice as wide as it is tall, and{' '}
          <C>orbit</C> and <C>spark</C> are square. <C>size</C> sets the width in pixels; height
          follows the motif. <C>tone</C> picks the ink: <C>ink</C> and <C>sage</C> follow the theme,
          while <C>inverse</C> (white) and <C>muted</C> are fixed, so check their contrast on your
          surface. <C>animated</C> adds a slow breathing pulse.
        </p>
      </Section>

      <Section title="Texture">
        <p>
          <C>PixelTexture</C> fills its nearest positioned ancestor. <C>variant</C> sets where pixels
          gather: <C>corner</C> toward the top end, <C>grain</C> across the field, <C>wave</C> along a
          horizontal band. <C>density</C> (<C>sparse</C>, <C>medium</C>, <C>dense</C>) changes how many
          squares are drawn; start with <C>sparse</C> behind long content. Opacity defaults to 0.13; set{' '}
          <C>--pixel-texture-opacity</C> on the surface to change it.
        </p>
        <p>
          Wrap the texture in its own absolutely positioned, clipped layer behind the content. Clipping
          the paint layer, not the card, keeps focus rings and menus free to overflow.
        </p>
        <Callout title="Filled buttons already have texture">
          <p>
            <C>Button variant="filled"</C> paints its own corner texture. Don't add a second one.
          </p>
        </Callout>
      </Section>

      <Section title="Shader">
        <p>
          <C>PixelShader</C> renders an animated, transparent pixel field on a canvas in the theme's{' '}
          <C>--lab-pixel-ink</C> and repaints when the theme changes. <C>density</C> (default 1.2)
          sets how strong the band is and <C>speed</C> (default 0.35) how fast it drifts. Size it with{' '}
          <C>className</C> or <C>style</C>, which are read when the canvas starts. It draws at up to 18
          frames per second, pauses off screen and in background tabs, and pointer presses anywhere
          on the page send a small ripple through it without catching the click.
        </p>
      </Section>

      <Section title="Reduced motion and forced colors">
        <p>
          With <C>prefers-reduced-motion: reduce</C>, the loader cells stop at a steady 70% opacity,
          artwork and texture stop breathing, and the shader paints one still frame with no ripples.
          In forced-colors mode, textures, the shader, decorative artwork and decorative loaders are
          hidden; artwork with a <C>title</C> and standalone loaders stay.
        </p>
      </Section>

      <Section title="Guidelines">
        <DoDont
          doItems={[
            'Seed with a stable id so the same record always looks the same.',
            <>Give <C>PixelLoader</C> a <C>label</C> that names the work: “Generating audio”.</>,
            <>Mark the loader <C>decorative</C> when the text next to it already says what is happening.</>,
            'Keep one texture per surface, and keep it sparse behind text.',
          ]}
          dontItems={[
            'Use pixel art to carry information that is not also in text.',
            'Use the shader or a texture as a progress indicator.',
            'Stack a texture inside a textured card or a filled button.',
            'Make artwork clickable; put it next to a labeled control instead.',
          ]}
        />
      </Section>

      <Section title="Accessibility">
        <p>
          <C>PixelLoader</C> is a <C>role="status"</C> with an <C>aria-label</C> (the localized
          “Loading…” by default); <C>decorative</C> hides it instead. <C>PixelArtwork</C> is hidden from
          assistive technology unless you pass <C>title</C>, which makes it a labeled{' '}
          <C>role="img"</C>; leave it out when a name sits next to it. <C>PixelTexture</C> and{' '}
          <C>PixelShader</C> are always hidden and ignore the pointer.
        </p>
      </Section>
    </>
  )
}

export default definePage({
  section: 'components',
  id: 'pixel-art',
  title: 'Pixel art',
  group: 'Feedback and motion',
  order: 10,
  summary:
    'Seeded pixel artwork, textures, an ambient shader and a loader: Feeef’s visual signature, decorative by default.',
  importLine:
    "import { PixelArtwork, PixelLoader, PixelShader, PixelTexture } from '@feeef.dev/ui/pixel-art'",
  source: 'src/pixel-art.tsx',
  api: ['PixelLoader', 'PixelArtwork', 'PixelTexture', 'PixelShader'],
  keywords: ['loader', 'spinner', 'loading', 'avatar', 'texture', 'shader', 'fingerprint', 'seed'],
  Overview,
  examples: examplesFrom(
    import.meta.glob('./examples/*.tsx', { eager: true }),
    import.meta.glob('./examples/*.tsx', { eager: true, query: '?raw', import: 'default' }),
    import.meta.glob('./examples/*.dart', { eager: true, query: '?raw', import: 'default' })
  ),
  Preview: () => (
    <>
      <span style={{ position: 'relative', display: 'grid', placeItems: 'center', width: 96, height: 72 }}>
        <PixelTexture variant="grain" seed="docs-preview" density="sparse" />
        <PixelArtwork variant="orbit" seed="docs-preview" size={48} tone="sage" />
      </span>
      <PixelLoader decorative />
    </>
  ),
})
