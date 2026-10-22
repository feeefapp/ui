import { LabPopoverSurface } from '@feeef.dev/ui/primitives/popover-surface'

export default function Static() {
  return (
    <LabPopoverSurface
      role="note"
      aria-label="Delivery estimate"
      style={{ width: 'min(100%, 300px)', padding: 16, display: 'grid', gap: 4 }}
    >
      <strong>Arrives Thursday</strong>
      <span>Home delivery to Oran · 650 DZD · Cash on delivery</span>
    </LabPopoverSurface>
  )
}

export const meta = {
  title: 'Without asChild',
  description:
    'Without asChild the surface renders its own div and passes attributes through. Useful for a floating layer you position yourself.',
}
