import { ArrowLeft, Download, MoreHorizontal, Plus } from 'lucide-react'
import { LabToolbar, LabToolbarGroup } from '@feeef.dev/ui/toolbar'
import { LabButton, LabIconButton } from '@feeef.dev/ui/primitives/button'
import '../toolbar-demo.css'

export default function Basic() {
  return (
    <div className="toolbar-demo-surface">
      <LabToolbar
        label="Products"
        leading={
          <LabToolbarGroup label="Navigation">
            <LabIconButton variant="text" appearance="toolbar" controlSize="compact" aria-label="Back to store">
              <ArrowLeft className="lab-dir-flip" />
            </LabIconButton>
            <span className="toolbar-demo-title">Products</span>
          </LabToolbarGroup>
        }
        trailing={
          <LabToolbarGroup label="Product actions">
            <LabIconButton variant="text" appearance="toolbar" controlSize="compact" aria-label="Export CSV">
              <Download />
            </LabIconButton>
            <LabIconButton variant="text" appearance="toolbar" controlSize="compact" aria-label="More actions">
              <MoreHorizontal />
            </LabIconButton>
            <LabButton variant="filled" appearance="toolbar" controlSize="compact">
              <Plus />
              Add product
            </LabButton>
          </LabToolbarGroup>
        }
      />
    </div>
  )
}

export const meta = {
  title: 'Leading and trailing groups',
  description:
    'LabToolbar only lays out its two sides. Each LabToolbarGroup is one glass pill for related controls; the gap between them stays click-through.',
}
