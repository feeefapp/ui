import { useEffect, useId, useState, type CSSProperties } from 'react'
import { GlassContainer, supportsElementRefraction, supportsRefraction } from '@feeef.dev/ui/glass'
import { GlassGroup } from '@feeef.dev/ui/scaffold'
import { Slider } from '@feeef.dev/ui/primitives/slider'
import { Button } from '@feeef.dev/ui/primitives/button'
import { SegmentedControl } from '@feeef.dev/ui/primitives/segmented'
import { definePage } from '../../../src/model'
import { Section, Callout } from '../../../src/blocks/prose'
import './reflection.css'

function Inspection() {
  const backdropId = `glass-backdrop-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const [canRefract, setCanRefract] = useState(false)
  useEffect(() => setCanRefract(supportsRefraction() || supportsElementRefraction()), [])
  const [background, setBackground] = useState('landscape')
  const [light, setLight] = useState('static')
  const [joined, setJoined] = useState('joined')
  const [highlightWidth, setHighlightWidth] = useState(1)
  const [highlightStrength, setHighlightStrength] = useState(1)
  const [refractionStrength, setRefractionStrength] = useState(1)
  const [tint, setTint] = useState(0)
  const [roundness, setRoundness] = useState(36)
  const [highlightProfile, setHighlightProfile] = useState<'rim' | 'surface'>('rim')
  const [refractionProfile, setRefractionProfile] = useState<'gentle' | 'measured'>('measured')
  const applyPreset = (preset: string) => {
    setRefractionProfile(preset === 'drop' ? 'gentle' : 'measured')
    setHighlightProfile(preset === 'drop' ? 'surface' : 'rim')
    setHighlightWidth(preset === 'drop' ? 7 : 1)
    setHighlightStrength(preset === 'drop' ? 1.2 : 1)
    setTint(preset === 'regular' ? 1 : preset === 'drop' ? 0.22 : 0)
    setRefractionStrength(1)
    setRoundness(36)
  }
  const preset = refractionStrength === 1 && roundness === 36
    ? refractionProfile === 'measured' && highlightProfile === 'rim' && highlightWidth === 1 && highlightStrength === 1
      ? tint === 1 ? 'regular' : tint === 0 ? 'clear' : ''
      : refractionProfile === 'gentle' && highlightProfile === 'surface' && highlightWidth === 7 && highlightStrength === 1.2 && tint === 0.22 ? 'drop' : ''
    : ''
  const tuning = { refractionProfile, highlightProfile, highlightWidth, highlightStrength, refractionStrength, tint, cornerShape: 'round' as const, backdropSource: backdropId }
  return <>
    <div className="reflection-live-panel" style={{ '--reflection-radius': `${roundness}px` } as CSSProperties}>
      <div id={`${backdropId}-controls`} className="reflection-backdrop" data-background="color" aria-hidden="true" />
      <GlassContainer {...tuning} backdropSource={`${backdropId}-controls`} light={light === 'static' ? 'static' : 'pointer'}>
      <GlassGroup className="reflection-control-surface">
    <div className="reflection-controls">
      <SegmentedControl label="Glass reference preset" value={preset} onChange={applyPreset} options={[
        { value: 'regular', label: 'Regular reference' }, { value: 'clear', label: 'Clear reference' }, { value: 'drop', label: 'Water drop' },
      ]} />
    </div>
    <p className="reflection-reference-note">{preset ? 'Reference starting point' : 'Custom tuning'} · Native screenshot fit, not official Apple shader values. Reference highlights are approximately 1px wide, with the measured mirrored lens band.</p>
    <div className="reflection-controls">
      <SegmentedControl label="Inspection background" className="demo-segmented-box" value={background} onChange={setBackground} options={[
        { value: 'plain', label: 'Plain' }, { value: 'grid', label: 'Grid' }, { value: 'color', label: 'Color' }, { value: 'landscape', label: 'Landscape' },
      ]} />
      <SegmentedControl label="Lens profile" className="demo-segmented-box" value={refractionProfile} onChange={value => setRefractionProfile(value as 'gentle' | 'measured')} options={[
        { value: 'measured', label: 'Reference lens' }, { value: 'gentle', label: 'Gentle lens' },
      ]} />
      <SegmentedControl label="Reflection light" className="demo-segmented-box" value={light} onChange={setLight} options={[
        { value: 'static', label: 'Fixed light' }, { value: 'pointer', label: 'Follow pointer' },
      ]} />
    </div>
    <div className="reflection-tuning">
      <div><div className="reflection-slider-label"><span>Highlight width</span><output>{highlightWidth.toFixed(2)} px</output></div>
        <Slider label="Highlight width" value={highlightWidth} min={0} max={100} step={0.25} onValueChange={setHighlightWidth} getValueText={value => `${value} pixels`} />
      </div>
      <div><div className="reflection-slider-label"><span>Highlight strength</span><output>{Math.round(highlightStrength * 100)}%</output></div>
        <Slider label="Highlight strength" value={highlightStrength} min={0} max={10} step={0.05} onValueChange={setHighlightStrength} getValueText={value => `${Math.round(value * 100)} percent`} />
      </div>
      <div><div className="reflection-slider-label"><span>Light bending</span><output>{Math.round(refractionStrength * 100)}%</output></div>
        <Slider disabled={!canRefract} label="Light bending" value={refractionStrength} min={0} max={10} step={0.05} onValueChange={setRefractionStrength} getValueText={value => `${Math.round(value * 100)} percent`} />
      </div>
      <div><div className="reflection-slider-label"><span>Surface tint</span><output>{Math.round(tint * 100)}%</output></div>
        <Slider label="Surface tint" value={tint} min={0} max={1} step={0.01} onValueChange={setTint} getValueText={value => `${Math.round(value * 100)} percent tint`} />
      </div>
      <div><div className="reflection-slider-label"><span>Corner radius</span><output>{roundness} px</output></div>
        <Slider label="Corner radius" value={roundness} min={0} max={120} step={1} onValueChange={setRoundness} getValueText={value => `${value} pixels`} />
      </div>
    </div>
    <div className="reflection-tuning-footer"><span>{canRefract ? 'Changes apply to this control panel and the glass below. Refraction must be enabled in Customize.' : 'This browser uses CSS glass with curved highlights. No live background source is supported here; its refraction slider is disabled.'}</span>
      <Button variant="text" onClick={() => applyPreset('clear')}>Reset tuning</Button>
    </div>
      </GlassGroup>
      </GlassContainer>
    </div>
    <div className="reflection-stage" data-background={background} style={{ '--reflection-radius': `${roundness}px` } as CSSProperties}>
      <div id={backdropId} className="reflection-backdrop" data-background={background} aria-hidden="true" />
      <div className="reflection-specimen" data-lab-backdrop={background === 'landscape' ? 'light' : undefined}>
        <GlassContainer {...tuning} adaptive light={light === 'static' ? 'static' : 'pointer'} className="reflection-row">
          <GlassGroup className="reflection-drop" aria-label="Round glass bubble" />
          <GlassGroup className="reflection-pill"><span>Long bubble</span></GlassGroup>
        </GlassContainer>
        <p>Round and long</p>
      </div>
      <div className="reflection-specimen" data-lab-backdrop={background === 'landscape' ? 'dark' : undefined}>
        <GlassContainer {...tuning} adaptive spacing={24} light={light === 'static' ? 'static' : 'pointer'} className="reflection-row" style={{ gap: joined === 'joined' ? 4 : 32 }}>
          <GlassGroup className="reflection-merge"><span>A</span></GlassGroup>
          <GlassGroup className="reflection-merge"><span>B</span></GlassGroup>
        </GlassContainer>
        <p>Watch the light turn through the joined curve</p>
      </div>
      <div className="reflection-specimen">
        <GlassContainer {...tuning} adaptive light={light === 'static' ? 'static' : 'pointer'} className="reflection-row">
          <GlassGroup className="reflection-large">
            <div className="reflection-card-content">
              <strong>Glass container</strong>
              <p>A real content surface using the same live settings as this page’s controls.</p>
              <Button variant="filled" onClick={() => applyPreset('clear')}>Restore reference</Button>
            </div>
          </GlassGroup>
        </GlassContainer>
        <p>A larger surface for wider highlights and corner radii</p>
      </div>
    </div>
    <div className="reflection-controls">
      <SegmentedControl label="Bubble spacing" className="demo-segmented-box" value={joined} onChange={setJoined} options={[
        { value: 'joined', label: 'Joined bubbles' }, { value: 'apart', label: 'Separate bubbles' },
      ]} />
    </div>
  </>
}

function Overview() {
  return <>
    <Inspection />
    <Section title="Light follows the surface">
      <p>A water drop catches light where its curved surface faces the light. The reflection turns around the corners and through the neck between joined bubbles. A long bubble has the same reflection strength along its straight edge; stretching its width does not stretch the lighting.</p>
      <p>In the Water drop preset, the web renderer gives the edge a convex cross-section: its surface normal turns from outward-facing at the edge to front-facing at the flat interior. An adjustable rounded bevel catches a soft band of light, fading out on both sides instead of drawing an inner outline. A sharp grazing reflection defines the edge, a broader reflection gives it polish, and gentle shading on the unlit inner bevel adds depth. The facing highlight is stronger than the opposite bounce reflection. Move the pointer with Follow pointer selected to turn that axis.</p>
    </Section>
    <Section title="How to inspect it">
      <p>The Clear reference starts with 0% tint, a 1px rim and 100% highlight strength. Regular reference uses the measured tinted material endpoint. Both use a symmetric reflection strongest along the top-left and bottom-right axis, fading inward from the silhouette. The Water drop preset keeps the broader 7px convex bevel for comparison. These presets reconstruct iOS 26.2 screenshots; Apple does not expose numeric highlight width, intensity or optical coefficients in its public Glass API. Light bending and highlight strength run from 0% (off) to 1000%; 100% is the normal lens, with stronger magnification and possible edge reversal above it. Corner radius is specified in pixels, from 0 to 120px, with 36px as the reference starting point. Circular corners are used throughout the geometry, highlights and lens. Radius stops changing a shape once it reaches half its shortest side: 36px for the small bubbles and 120px for the large specimen. The large specimen makes the rest of the range visible. This is an iOS-inspired starting point, not an exact measured iOS 27 radius. Surface tint controls how much of the opaque theme surface covers the background; it is independent of the highlight. Start with Plain and Fixed light. Look for a continuous reflection that turns smoothly around each corner. Compare the round bubble with the long one, then separate and join the lower bubbles to inspect the inward curves.</p>
      <p>Grid reveals distortion in the content behind the glass. Reference lens intentionally mirrors a narrow band at the edge even at 100%, matching the measured native sampling pattern. Gentle lens compresses lines smoothly at 100%; higher strengths can fold them. Color makes transparency and tint easier to see. Landscape adds a bright sky, a dark ridge and a warm foreground so you can judge separation over changing contrast. Those effects are separate from the white surface reflection. Use Customize to compare light and dark themes, clear and tinted glass, and refraction on or off.</p>
    </Section>
    <Callout title="Use liquid or still glass">Solid glass and accessibility settings that reduce transparency hide the decorative reflection. Still glass keeps a fixed light. Pointer lighting is available with liquid glass and a mouse or pen.</Callout>
    <Section title="What matches the reference">
      <p>The rim uses the local curve normal, including merged necks. Its light-theme opacity spans 27–72%; dark-theme opacity spans 14–25%, before your strength multiplier. Those values and the approximately 1pt width come from the repository’s native iOS 26.2 screenshot measurements. The inward falloff is a fitted web approximation. The small bubbles reach a true capsule at a 36px radius.</p>
      <p>Apple’s <a href="https://developer.apple.com/documentation/swiftui/glass">Glass API</a> exposes Regular and Clear materials, tint and interaction, rather than optical shader constants. The lens profile restores the measured inward shift of up to 47px over a 27px band, scaled down for smaller bubbles. Gentle lens retains the non-reversing web profile. Optional theme blur and the authored Firefox backdrop remain differences from the native renderer. Enable blur in Customize when comparing the full material. Clear is best inspected over rich backgrounds; Regular prioritizes readable content.</p>
    </Section>
    <Section title="Surface model reference"><p>The <a href="https://kube.io/blog/liquid-glass-css-svg/">Liquid Glass in the Browser</a> article explains surface profiles, normals and a separate specular layer. This demo applies that surface-profile approach to the kit’s blended bubble geometry. Apple’s <a href="https://developer.apple.com/videos/play/wwdc2025/219/">Meet Liquid Glass</a> explains how lensing, highlights and shadows work together. This web material approximates those layers; it is not Apple’s native renderer.</p></Section>
    <Section title="Implementation and accessibility">
      <p>The reflection uses the same blended surface as the material, with no extra interactive layer. Highlights paint into persistent canvases without rebuilding image masks. Geometry is cached while the light moves. Firefox samples the separate background paint layer as a live element image and runs the same displacement map through a regular SVG filter. A shared worker calculates changing lens maps without blocking pointer updates; the previous decoded lens stays visible until its replacement is ready. The source must be separate from the glass to avoid a recursive image. Chromium filters the actual backdrop directly. The controls retain keyboard access, and reduced motion keeps the geometry changes immediate.</p>
    </Section>
  </>
}

export default definePage({
  section: 'foundations', id: 'glass-reflections', title: 'Glass reflections', order: 5,
  summary: 'Inspect light on curved glass, long bubbles and the neck between joined surfaces.',
  keywords: ['liquid glass', 'water drop', 'rim', 'light', 'reflection', 'inspection'], Overview,
})
