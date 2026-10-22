import { useState } from 'react'
import { Bold, Italic, Link2, Redo2, Undo2 } from 'lucide-react'
import { LabToolbar, LabToolbarGroup } from '@feeef.dev/ui/toolbar'
import { LabButton, LabIconButton } from '@feeef.dev/ui/primitives/button'
import '../toolbar-demo.css'

export default function Segments() {
  const [bold, setBold] = useState(false)
  const [italic, setItalic] = useState(false)
  return (
    <div className="toolbar-demo-surface">
      <LabToolbar
        label="Product description editor"
        leading={
          <>
            <LabToolbarGroup label="History">
              <LabIconButton variant="text" appearance="toolbar" controlSize="compact" aria-label="Undo">
                <Undo2 />
              </LabIconButton>
              <LabIconButton variant="text" appearance="toolbar" controlSize="compact" aria-label="Redo" disabled>
                <Redo2 />
              </LabIconButton>
            </LabToolbarGroup>
            <LabToolbarGroup label="Text style" style={{ marginInlineStart: 8 }}>
              <LabIconButton
                variant="text"
                appearance="toolbar"
                controlSize="compact"
                aria-label="Bold"
                aria-pressed={bold}
                onClick={() => setBold(!bold)}
              >
                <Bold />
              </LabIconButton>
              <LabIconButton
                variant="text"
                appearance="toolbar"
                controlSize="compact"
                aria-label="Italic"
                aria-pressed={italic}
                onClick={() => setItalic(!italic)}
              >
                <Italic />
              </LabIconButton>
              <LabIconButton variant="text" appearance="toolbar" controlSize="compact" aria-label="Insert link">
                <Link2 />
              </LabIconButton>
            </LabToolbarGroup>
          </>
        }
        trailing={
          <LabToolbarGroup label="Document">
            <LabButton variant="filled" appearance="toolbar" controlSize="compact">
              Save
            </LabButton>
          </LabToolbarGroup>
        }
      />
    </div>
  )
}

export const meta = {
  title: 'Several groups',
  description:
    'Split unrelated controls into separate groups (history, text style, document) so each pill reads as one set. Toggles use aria-pressed.',
}
