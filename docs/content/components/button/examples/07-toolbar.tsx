import { Bold, Italic, Underline } from 'lucide-react'
import { Button, IconButton } from '@feeef.dev/ui/primitives/button'
import { Toolbar, ToolbarGroup } from '@feeef.dev/ui/toolbar'

export default function ToolbarAppearance() {
  return (
    <Toolbar
      label="Formatting"
      className="demo-wide"
      leading={
        <ToolbarGroup label="Text style">
          <IconButton variant="text" appearance="toolbar" aria-label="Bold" aria-pressed="true">
            <Bold size={18} />
          </IconButton>
          <IconButton variant="text" appearance="toolbar" aria-label="Italic">
            <Italic size={18} />
          </IconButton>
          <IconButton variant="text" appearance="toolbar" aria-label="Underline">
            <Underline size={18} />
          </IconButton>
        </ToolbarGroup>
      }
      trailing={
        <ToolbarGroup label="Document">
          <Button variant="filled" appearance="toolbar" controlSize="compact">
            Publish
          </Button>
        </ToolbarGroup>
      }
    />
  )
}

export const meta = {
  title: 'In a toolbar',
  description:
    'appearance="toolbar" drops the button’s own surface so it shares the group’s glass. A filled button stays prominent.',
}
