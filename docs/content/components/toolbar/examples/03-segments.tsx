import { useState } from 'react'
import { Bold, Italic, Link2, Redo2, Undo2 } from 'lucide-react'
import { Toolbar, ToolbarGroup } from '@feeef.dev/ui/toolbar'
import { Button, IconButton } from '@feeef.dev/ui/primitives/button'
import '../toolbar-demo.css'

export default function Segments() {
  const [bold, setBold] = useState(false)
  const [italic, setItalic] = useState(false)
  return (
    <div className="toolbar-demo-surface">
      <Toolbar
        label="Product description editor"
        leading={
          <>
            <ToolbarGroup label="History">
              <IconButton variant="text" appearance="toolbar" aria-label="Undo">
                <Undo2 />
              </IconButton>
              <IconButton variant="text" appearance="toolbar" aria-label="Redo" disabled>
                <Redo2 />
              </IconButton>
            </ToolbarGroup>
            <ToolbarGroup label="Text style" style={{ marginInlineStart: 8 }}>
              <IconButton
                variant="text"
                appearance="toolbar"
                aria-label="Bold"
                aria-pressed={bold}
                onClick={() => setBold(!bold)}
              >
                <Bold />
              </IconButton>
              <IconButton
                variant="text"
                appearance="toolbar"
                aria-label="Italic"
                aria-pressed={italic}
                onClick={() => setItalic(!italic)}
              >
                <Italic />
              </IconButton>
              <IconButton variant="text" appearance="toolbar" aria-label="Insert link">
                <Link2 />
              </IconButton>
            </ToolbarGroup>
          </>
        }
        trailing={
          <ToolbarGroup label="Document">
            <Button variant="filled" appearance="toolbar">
              Save
            </Button>
          </ToolbarGroup>
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
