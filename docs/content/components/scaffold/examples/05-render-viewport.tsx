import { useRef } from 'react'
import { ArrowDown } from 'lucide-react'
import { LabScaffold, LabScaffoldAppBar } from '@feeef.dev/ui/workspace/scaffold'
import { LabScrollArea, revealScrollChild } from '@feeef.dev/ui/scroll'
import { LabToolbarGroup } from '@feeef.dev/ui/toolbar'
import { LabDock } from '@feeef.dev/ui/dock'
import { LabButton } from '@feeef.dev/ui/primitives/button'
import '../scaffold-demo.css'

const LINES = Array.from({ length: 12 }, (_, i) => `Line ${i + 1} · Wireless earbuds × ${i + 1}`)

export default function RenderViewport() {
  const viewport = useRef<HTMLDivElement>(null)
  const last = useRef<HTMLDivElement>(null)
  return (
    <div className="scaffold-demo-frame">
      <LabScaffold
        appBar={
          <LabScaffoldAppBar>
            <LabToolbarGroup label="Current page">
              <span className="scaffold-demo-title">Invoice #2210</span>
            </LabToolbarGroup>
          </LabScaffoldAppBar>
        }
        bottom={
          <LabDock label="Invoice actions">
            <LabButton
              variant="tonal"
              onClick={() => revealScrollChild(viewport.current, last.current, { behavior: 'smooth' })}
            >
              <ArrowDown />
              Jump to total
            </LabButton>
          </LabDock>
        }
        // The editor owns its scroll area (and its ref), and floats the scaffold's chrome itself.
        renderViewport={({ appBar, bottom }) => (
          <LabScrollArea ref={viewport} label="Invoice lines" contentPadding={16} top={appBar} bottom={bottom}>
            <div className="scaffold-demo-list">
              {LINES.map((line) => (
                <div key={line} className="scaffold-demo-row">
                  {line}
                </div>
              ))}
              <div ref={last} className="scaffold-demo-row">
                <strong>Total</strong>
                <strong>38 400 DA</strong>
              </div>
            </div>
          </LabScrollArea>
        )}
      >
        {null}
      </LabScaffold>
    </div>
  )
}

export const meta = {
  title: 'Your own viewport',
  description:
    'renderViewport replaces the built-in content scroll area. It receives the rendered appBar and bottom so an editor can float them in its own LabScrollArea.',
}
