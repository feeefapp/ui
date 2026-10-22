import { useRef, type ReactNode } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { Check, Palette as PaletteIcon, Pipette } from 'lucide-react'
import { Button, IconButton } from '@feeef.dev/ui/primitives/button'
import { NumberField } from '@feeef.dev/ui/primitives/number-field'
import { PopoverSurface } from '@feeef.dev/ui/primitives/popover-surface'
import { SegmentedControl } from '@feeef.dev/ui/primitives/segmented'
import { useTheme, type ThemeMode } from '@feeef.dev/ui/theme'
import type { Density, GlassStyle, Palette } from '@feeef.dev/ui/theme-config'
import { useDocsSettings, type DocsSettings } from '../settings'

/** Preset primaries; `null` is the palette's own color (Feeef green, or black in mono). */
const COLORS: { name: string; value: string | null }[] = [
  { name: 'Palette default', value: null },
  { name: 'Blue', value: '#2563eb' },
  { name: 'Violet', value: '#7c3aed' },
  { name: 'Rose', value: '#e11d48' },
  { name: 'Orange', value: '#ea580c' },
  { name: 'Teal', value: '#0d9488' },
]

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="docs-customize-row">
      <span aria-hidden="true">{label}</span>
      {children}
    </div>
  )
}

/** Primary color: preset swatches plus any custom color from the system picker. */
function ColorPicker() {
  const { settings, update } = useDocsSettings()
  const picker = useRef<HTMLInputElement>(null)
  const current = settings.theme.primary ?? null
  const custom = current !== null && !COLORS.some((c) => c.value === current)
  return (
    <div className="docs-swatches" role="group" aria-label="Primary color">
      {COLORS.map((color) => (
        <IconButton
          key={color.name}
          variant="text"
          controlSize="compact"
          className="docs-swatch"
          aria-label={color.name}
          aria-pressed={current === color.value}
          title={color.name}
          onClick={() => update({ theme: { primary: color.value ?? undefined } })}
        >
          <span className="docs-swatch-dot" data-default={color.value === null || undefined} style={{ background: color.value ?? undefined }}>
            {current === color.value && <Check size={14} />}
          </span>
        </IconButton>
      ))}
      <IconButton
        variant="text"
        controlSize="compact"
        className="docs-swatch"
        aria-label="Custom color"
        aria-pressed={custom}
        title="Custom color"
        onClick={() => picker.current?.click()}
      >
        <span className="docs-swatch-dot" data-custom style={custom ? { background: current! } : undefined}>
          {custom ? <Check size={14} /> : <Pipette size={14} />}
        </span>
      </IconButton>
      <input
        ref={picker}
        type="color"
        className="docs-swatch-input"
        tabIndex={-1}
        aria-hidden="true"
        value={current ?? '#72ce5d'}
        onChange={(event) => update({ theme: { primary: event.target.value } })}
      />
    </div>
  )
}

/**
 * Live theme controls: everything here is the kit's own `ThemeConfig` and locale, so every
 * demo on the page shows exactly what an app would get with those settings.
 */
export function Customize() {
  const { settings, update, reset } = useDocsSettings()
  const { mode, setMode } = useTheme()
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <IconButton
          className="docs-customize-trigger"
          variant="text"
          appearance="toolbar"
          aria-label="Customize theme"
          title="Customize theme"
        >
          <PaletteIcon size={20} />
        </IconButton>
      </Popover.Trigger>
      <Popover.Portal>
        <PopoverSurface asChild>
          <Popover.Content
            className="docs-customize"
            align="end"
            sideOffset={8}
            collisionPadding={12}
            dir="ltr"
            lang="en"
          >
            <h2>Customize</h2>
            <p>
              Applies to every demo: these are <code>Provider</code>’s <code>theme</code> and{' '}
              <code>i18n</code> props. The demo language also sets the demos’ direction.
            </p>
            <Row label="Mode">
              <SegmentedControl<ThemeMode>
                label="Mode"
                value={mode}
                onChange={setMode}
                options={[
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                  { value: 'system', label: 'System' },
                ]}
              />
            </Row>
            <Row label="Color">
              <ColorPicker />
            </Row>
            <Row label="Palette">
              <SegmentedControl<Palette>
                label="Palette"
                value={settings.theme.palette}
                onChange={(palette) => update({ theme: { palette } })}
                options={[
                  { value: 'lab', label: 'Lab (tinted)' },
                  { value: 'mono', label: 'Mono (neutral)' },
                ]}
              />
            </Row>
            <Row label="Density">
              <SegmentedControl<Density>
                label="Density"
                value={settings.theme.density}
                onChange={(density) => update({ theme: { density } })}
                options={[
                  { value: 'comfortable', label: 'Comfortable' },
                  { value: 'compact', label: 'Compact' },
                  { value: 'thin', label: 'Thin' },
                ]}
              />
            </Row>
            <Row label="Glass">
              <SegmentedControl<GlassStyle>
                label="Glass"
                value={settings.theme.glass}
                onChange={(glass) => update({ theme: { glass } })}
                options={[
                  { value: 'liquid', label: 'Liquid' },
                  { value: 'frosted', label: 'Frosted' },
                  { value: 'solid', label: 'Solid' },
                ]}
              />
            </Row>
            <NumberField
              label="Corner radius"
              controlSize="compact"
              min={0}
              max={1.5}
              step={0.05}
              value={settings.theme.radius}
              defaultValue={1}
              format={(value) => `${Math.round(value * 100)}%`}
              onValueChange={(radius) => update({ theme: { radius } })}
            />
            <Row label="Demo language">
              <SegmentedControl<DocsSettings['locale']>
                label="Demo language"
                value={settings.locale}
                onChange={(locale) => update({ locale })}
                options={[
                  { value: 'en', label: 'English' },
                  { value: 'fr', label: 'Français' },
                  { value: 'ar', label: 'العربية' },
                ]}
              />
            </Row>
            <Button variant="text" controlSize="compact" onClick={reset}>
              Reset to defaults
            </Button>
          </Popover.Content>
        </PopoverSurface>
      </Popover.Portal>
    </Popover.Root>
  )
}
