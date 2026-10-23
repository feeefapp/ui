import { Share2 } from 'lucide-react'
import { GlassGroup } from '@feeef.dev/ui/scaffold'
import { Button, IconButton } from '@feeef.dev/ui/primitives/button'
import '../glass-demo.css'

export default function Landmark() {
  return (
    <div className="glass-demo-backdrop">
      <GlassGroup as="header" className="glass-demo-header">
        <strong>Store preview</strong>
        <span className="demo-row">
          <IconButton variant="text" appearance="toolbar" controlSize="small" aria-label="Share store link">
            <Share2 />
          </IconButton>
          <Button variant="filled" controlSize="small">
            Publish
          </Button>
        </span>
      </GlassGroup>
    </div>
  )
}

export const meta = {
  title: 'Semantic element',
  description: 'as picks the element, so a floating group can be a header, nav, aside, section or footer.',
}
