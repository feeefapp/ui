import { Bell, MoreHorizontal, Settings, Trash2 } from 'lucide-react'
import { IconButton } from '@feeef.dev/ui/primitives/button'

export default function IconButtons() {
  return (
    <div className="demo-row">
      <IconButton variant="text" aria-label="Notifications">
        <Bell size={20} />
      </IconButton>
      <IconButton variant="elevated" aria-label="Settings">
        <Settings size={20} />
      </IconButton>
      <IconButton variant="tonal" aria-label="More actions">
        <MoreHorizontal size={20} />
      </IconButton>
      <IconButton variant="destructive" controlSize="compact" aria-label="Delete">
        <Trash2 size={18} />
      </IconButton>
    </div>
  )
}

export const meta = {
  title: 'Icon buttons',
  description: 'IconButton is square and requires an aria-label, because the icon is its only content.',
}
