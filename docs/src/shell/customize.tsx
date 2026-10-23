import { useRef, type ReactNode } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { Check, Palette as PaletteIcon, Pipette } from 'lucide-react'
import { Button, IconButton } from '@feeef.dev/ui/primitives/button'
import { NumberField } from '@feeef.dev/ui/primitives/number-field'
import { PopoverSurface } from '@feeef.dev/ui/primitives/popover-surface'
import { SegmentedControl } from '@feeef.dev/ui/primitives/segmented'
import { SlideSwitch, Slider } from '@feeef.dev/ui/primitives/slider'
import { useTheme, type ThemeMode } from '@feeef.dev/ui/theme'
import { PROFILES, THEME_DEFAULTS, type Density, type GlassStyle, type Motion, type Palette } from '@feeef.dev/ui/theme-config'
import { useDocsSettings, type DocsSettings } from '../settings'
import { PlatformSwitch, VersionMenu } from './platform'

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

/** An on/off option: its name, then the switch. */
function SwitchRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="docs-customize-switch">
      <span aria-hidden="true">{label}</span>
      <SlideSwitch label={label} checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

/**
 * The Liquid Glass setting, like iOS 27's: one slider from clear to tinted (the midpoint is the
 * default), then blur and refraction.
 */
function GlassSettings() {
  const { settings, update } = useDocsSettings()
  const tint = settings.theme.glassTint
  return (
    <div className="docs-customize-row">
      <span aria-hidden="true">Liquid Glass</span>
      <Slider
        label="Liquid Glass"
        controlSize="small"
        trackStyle="thin"
        min={0}
        max={1}
        step={0.05}
        value={tint}
        marks={[{ value: THEME_DEFAULTS.glassTint }]}
        getValueText={(value) =>
          value === THEME_DEFAULTS.glassTint ? 'Standard' : `${Math.round(value * 100)}% tinted`
        }
        onValueChange={(glassTint) => update({ theme: { glassTint } })}
      />
      <div className="docs-customize-scale" aria-hidden="true">
        <span>Clear</span>
        <span>Tinted</span>
      </div>
      <SwitchRow label="Blur" checked={settings.theme.glassBlur} onChange={(glassBlur) => update({ theme: { glassBlur } })} />
      <SwitchRow
        label="Refraction"
        checked={settings.theme.glassRefraction}
        onChange={(glassRefraction) => update({ theme: { glassRefraction } })}
      />
    </div>
  )
}

type ProfileName = keyof typeof PROFILES | 'custom'
const PROFILE_KEYS = ['glass', 'glassRefraction', 'glassBlur', 'motion'] as const

/** The profile the current settings match, or `custom` once any of its fields is changed by hand. */
function currentProfile(theme: DocsSettings['theme']): ProfileName {
  for (const name of Object.keys(PROFILES) as (keyof typeof PROFILES)[])
    if (PROFILE_KEYS.every((key) => theme[key] === PROFILES[name][key])) return name
  return 'custom'
}

/** Profile presets (`PROFILES`): picking one sets its fields; Custom returns them to the kit defaults. */
function ProfilePicker() {
  const { settings, update } = useDocsSettings()
  return (
    <SegmentedControl<ProfileName>
      label="Profile"
      equalWidth
      value={currentProfile(settings.theme)}
      onChange={(name) => {
        const source = name === 'custom' ? THEME_DEFAULTS : PROFILES[name]
        update({ theme: Object.fromEntries(PROFILE_KEYS.map((key) => [key, source[key]])) })
      }}
      options={[
        { value: 'quality', label: 'Quality' },
        { value: 'balanced', label: 'Balanced' },
        { value: 'performance', label: 'Performance' },
        { value: 'custom', label: 'Custom' },
      ]}
    />
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
          controlSize="small"
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
        controlSize="small"
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
            <Row label="Code">
              <PlatformSwitch equalWidth />
            </Row>
            <Row label="Version">
              <VersionMenu />
            </Row>
            <Row label="Mode">
              <SegmentedControl<ThemeMode>
                label="Mode"
                equalWidth
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
                equalWidth
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
                equalWidth
                value={settings.theme.density}
                onChange={(density) => update({ theme: { density } })}
                options={[
                  { value: 'comfortable', label: 'Comfortable' },
                  { value: 'compact', label: 'Compact' },
                  { value: 'thin', label: 'Thin' },
                ]}
              />
            </Row>
            <Row label="Profile">
              <ProfilePicker />
            </Row>
            <Row label="Glass">
              <SegmentedControl<GlassStyle>
                label="Glass"
                equalWidth
                value={settings.theme.glass}
                onChange={(glass) => update({ theme: { glass } })}
                options={[
                  { value: 'liquid', label: 'Liquid' },
                  { value: 'still', label: 'Still' },
                  { value: 'solid', label: 'Solid' },
                ]}
              />
            </Row>
            <GlassSettings />
            <Row label="Motion">
              <SegmentedControl<Motion>
                label="Motion"
                equalWidth
                value={settings.theme.motion}
                onChange={(motion) => update({ theme: { motion } })}
                options={[
                  { value: 'full', label: 'Full' },
                  { value: 'reduced', label: 'Reduced' },
                  { value: 'none', label: 'None' },
                ]}
              />
            </Row>
            <NumberField
              label="Corner radius"
              controlSize="small"
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
                equalWidth
                value={settings.locale}
                onChange={(locale) => update({ locale })}
                options={[
                  { value: 'en', label: 'English' },
                  { value: 'fr', label: 'Français' },
                  { value: 'ar', label: 'العربية' },
                ]}
              />
            </Row>
            <Button variant="text" controlSize="small" onClick={reset}>
              Reset to defaults
            </Button>
          </Popover.Content>
        </PopoverSurface>
      </Popover.Portal>
    </Popover.Root>
  )
}
