import { useLayoutEffect, useRef } from 'react'
import { LucideMenu, LucideZoomIn } from 'lucide-react'
import { WorkspaceHeader } from '@feeef.dev/ui/navigation/workspace-header'
import { FoAnimatedLogo } from '@feeef.dev/ui/brand/logo'
import { FO_ANIMATED_LOGO_SVG } from '@feeef.dev/ui/brand/animated-logo'
import { PixelArtwork, PixelTexture } from '@feeef.dev/ui/pixel-art'
import { Button, IconButton } from '@feeef.dev/ui/primitives/button'
import { Input, Label } from '@feeef.dev/ui/primitives/fields'
import { SlideSwitch } from '@feeef.dev/ui/primitives/slider'
import '@feeef.dev/ui/account-sidebar.css'

/**
 * Scenes for the brand, header and avatar ports (flutter/example/lib/brand_scenes.dart).
 * `header`: WorkspaceHeader embedded in a `.lab-scaffold` (the Lab's stylesheet,
 * account-sidebar.css). At the 800px capture viewport the title column is hidden (≤ 900px).
 */
export function HeaderScene() {
  return (
    <div className="lab-scaffold" style={{ minHeight: 0, alignSelf: 'stretch' }}>
      <WorkspaceHeader
        embedded
        toggle={
          <IconButton variant="text" aria-label="Menu">
            <LucideMenu />
          </IconButton>
        }
        title="Voice"
        detail="Untitled project"
        brandLabel="Feeef Lab"
        brandSuffix="lab"
        tools={
          <IconButton variant="ghost" appearance="toolbar" aria-label="Zoom in">
            <LucideZoomIn />
          </IconButton>
        }
        actions={
          <Button variant="filled" appearance="toolbar">
            Share
          </Button>
        }
      />
      <div style={{ height: 24 }} />
      <WorkspaceHeader
        embedded
        toggle={
          <IconButton variant="text" aria-label="Menu">
            <LucideMenu />
          </IconButton>
        }
        title="Orders"
      />
    </div>
  )
}

/** The SMIL wordmark frozen at `time` seconds (svg.setCurrentTime), like FoAnimatedLogoPlayer(time:). */
function AnimatedLogoAt({ time }: { time: number }) {
  const host = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const svg = host.current?.querySelector('svg')
    if (!svg) return
    svg.pauseAnimations()
    svg.setCurrentTime(time)
  }, [time])
  return (
    <div
      ref={host}
      style={{ width: 150, height: 150, display: 'flex' }}
      dangerouslySetInnerHTML={{ __html: FO_ANIMATED_LOGO_SVG }}
    />
  )
}

export function BrandScene() {
  return (
    <>
      <div className="row">
        <FoAnimatedLogo />
        <FoAnimatedLogo width={100} height={27} />
        <FoAnimatedLogo width={60} height={18} />
        <span style={{ color: 'var(--lab-muted)', display: 'inline-flex' }}>
          <FoAnimatedLogo width={104} height={26} />
        </span>
      </div>
      <div className="row">
        <AnimatedLogoAt time={0.9} />
        <AnimatedLogoAt time={1.6} />
        <AnimatedLogoAt time={10} />
      </div>
    </>
  )
}

export function AvatarScene() {
  return (
    <>
      <div className="row">
        {['voice_7f2a', 'voice_31c9', 'voice_b04e', 'Amina'].map((seed) => (
          <PixelArtwork key={seed} variant="voice" seed={seed} size={64} />
        ))}
        <PixelArtwork variant="voice" seed="feeef" size={40} />
      </div>
      <div className="row">
        <PixelArtwork variant="wave" seed="order-1042" size={128} />
        <PixelArtwork variant="orbit" seed="order-1042" size={72} tone="sage" />
        <PixelArtwork variant="spark" seed="order-1042" size={72} tone="muted" />
      </div>
      <div className="row">
        {(['corner', 'grain', 'wave'] as const).map((variant) => (
          <div
            key={variant}
            style={{ position: 'relative', width: 200, height: 72, background: 'var(--lab-ground)', color: 'var(--lab-ink)' }}
          >
            <PixelTexture variant={variant} seed="parity" density="dense" style={{ opacity: 0.5 }} />
          </div>
        ))}
      </div>
      <div className="row" style={{ alignItems: 'flex-end' }}>
        <div style={{ display: 'grid', gap: 6, width: 240 }}>
          <Label>Phone</Label>
          <Input aria-label="Phone" placeholder="0550 00 00 00" />
        </div>
        <SlideSwitch label="SMS" checked onCheckedChange={() => {}} />
        <SlideSwitch label="Email" checked={false} onCheckedChange={() => {}} />
      </div>
    </>
  )
}
