import { Bell, MoreHorizontal, Settings, Trash2 } from 'lucide-react'
import { LabIconButton } from '@feeef.dev/ui/primitives/button'

export default function IconButtons() {
  return (
    <div className="demo-row">
      <LabIconButton variant="text" aria-label="Notifications">
        <Bell size={20} />
      </LabIconButton>
      <LabIconButton variant="elevated" aria-label="Settings">
        <Settings size={20} />
      </LabIconButton>
      <LabIconButton variant="tonal" aria-label="More actions">
        <MoreHorizontal size={20} />
      </LabIconButton>
      <LabIconButton variant="destructive" controlSize="compact" aria-label="Delete">
        <Trash2 size={18} />
      </LabIconButton>
    </div>
  )
}

export const meta = {
  title: 'Icon buttons',
  description: 'LabIconButton is square and requires an aria-label, because the icon is its only content.',
}
