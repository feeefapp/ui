import { Bold, Italic, Underline } from 'lucide-react'
import { LabButton, LabIconButton } from '@feeef.dev/ui/primitives/button'
import { LabToolbar, LabToolbarGroup } from '@feeef.dev/ui/toolbar'

export default function ToolbarAppearance() {
  return (
    <LabToolbar
      label="Formatting"
      className="demo-wide"
      leading={
        <LabToolbarGroup label="Text style">
          <LabIconButton variant="text" appearance="toolbar" aria-label="Bold" aria-pressed="true">
            <Bold size={18} />
          </LabIconButton>
          <LabIconButton variant="text" appearance="toolbar" aria-label="Italic">
            <Italic size={18} />
          </LabIconButton>
          <LabIconButton variant="text" appearance="toolbar" aria-label="Underline">
            <Underline size={18} />
          </LabIconButton>
        </LabToolbarGroup>
      }
      trailing={
        <LabToolbarGroup label="Document">
          <LabButton variant="filled" appearance="toolbar" controlSize="compact">
            Publish
          </LabButton>
        </LabToolbarGroup>
      }
    />
  )
}

export const meta = {
  title: 'In a toolbar',
  description:
    'appearance="toolbar" drops the button’s own surface so it shares the group’s glass. A filled button stays prominent.',
}
