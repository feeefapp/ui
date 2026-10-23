import { ArrowLeft, Download, MoreHorizontal, Plus } from 'lucide-react'
import { Toolbar, ToolbarGroup } from '@feeef.dev/ui/toolbar'
import { Button, IconButton } from '@feeef.dev/ui/primitives/button'
import '../toolbar-demo.css'

export default function Basic() {
  return (
    <div className="toolbar-demo-surface">
      <Toolbar
        label="Products"
        leading={
          <ToolbarGroup label="Navigation">
            <IconButton variant="text" appearance="toolbar" aria-label="Back to store">
              <ArrowLeft className="lab-dir-flip" />
            </IconButton>
            <span className="toolbar-demo-title">Products</span>
          </ToolbarGroup>
        }
        trailing={
          <ToolbarGroup label="Product actions">
            <IconButton variant="text" appearance="toolbar" aria-label="Export CSV">
              <Download />
            </IconButton>
            <IconButton variant="text" appearance="toolbar" aria-label="More actions">
              <MoreHorizontal />
            </IconButton>
            <Button variant="filled" appearance="toolbar">
              <Plus />
              Add product
            </Button>
          </ToolbarGroup>
        }
      />
    </div>
  )
}

export const meta = {
  title: 'Leading and trailing groups',
  description:
    'Toolbar only lays out its two sides. Each ToolbarGroup is one glass pill for related controls; the gap between them stays click-through.',
}
