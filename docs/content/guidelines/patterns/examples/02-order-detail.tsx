import { useLayoutEffect, useRef, useState } from 'react'
import { ArrowLeft, PanelRight, Phone, Printer } from 'lucide-react'
import { ScrollArea } from '@feeef.dev/ui/scroll'
import { Toolbar, ToolbarGroup } from '@feeef.dev/ui/toolbar'
import { Dock } from '@feeef.dev/ui/dock'
import { Button, IconButton } from '@feeef.dev/ui/primitives/button'
import { Sheet } from '@feeef.dev/ui/containers'
import '../patterns.css'

/** True while the element is narrower than `breakpoint`: the inspector then lives in a dialog. */
function useNarrow(breakpoint: number) {
  const ref = useRef<HTMLDivElement>(null)
  const [narrow, setNarrow] = useState(false)
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const measure = () => setNarrow(element.clientWidth < breakpoint)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [breakpoint])
  return [ref, narrow] as const
}

function OrderFacts() {
  return (
    <dl className="pt-facts">
      {[
        ['Status', 'Waiting for confirmation'],
        ['Phone', '0555 12 34 56'],
        ['Wilaya', '16 · Alger, Bab Ezzouar'],
        ['Courier', 'Yalidine · home delivery'],
        ['Delivery fee', '600 DA'],
        ['Total to collect', '9 600 DA'],
      ].map(([term, value]) => (
        <div key={term}>
          <dt>{term}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

export default function OrderDetail() {
  const [frame, narrow] = useNarrow(640)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  return (
    <div ref={frame} className="pt-frame">
      <ScrollArea
        label="Order #1048"
        top={
          <Toolbar
            label="Order toolbar"
            leading={
              <ToolbarGroup label="Navigation">
                <IconButton variant="text" appearance="toolbar" aria-label="Back to orders">
                  <ArrowLeft className="lab-dir-flip" />
                </IconButton>
                <span className="pt-title">Order #1048</span>
              </ToolbarGroup>
            }
            trailing={
              <ToolbarGroup label="Order tools">
                <IconButton variant="text" appearance="toolbar" aria-label="Call Amina Benali">
                  <Phone />
                </IconButton>
                <IconButton variant="text" appearance="toolbar" aria-label="Print shipping label">
                  <Printer />
                </IconButton>
                {narrow && (
                  <IconButton
                    variant="text"
                    appearance="toolbar"
                    aria-label="Order details"
                    aria-haspopup="dialog"
                    onClick={() => setDetailsOpen(true)}
                  >
                    <PanelRight />
                  </IconButton>
                )}
              </ToolbarGroup>
            }
          />
        }
        bottom={
          <Dock
            label="Order actions"
            // On a phone the call count is already in the content; the dock keeps its width for the actions.
            content={narrow ? undefined : <span className="pt-status">{confirmed ? 'Confirmed' : 'Call 3 of 5'}</span>}
          >
            <div className="pt-dock-row">
              <Button variant="tonal">Call back later</Button>
              <Button variant="filled" onClick={() => setConfirmed(!confirmed)}>
                {confirmed ? 'Undo confirm' : 'Confirm order'}
              </Button>
            </div>
          </Dock>
        }
      >
        <div className="pt-detail" data-inspector={!narrow || undefined}>
          <div className="pt-main">
            <h3>Amina Benali</h3>
            <p className="pt-muted">Placed yesterday at 18:03 from Instagram</p>
            <section className="pt-card" aria-label="Products">
              <h4>Products</h4>
              <div className="pt-line">
                <span>Wireless earbuds Pro × 1</span>
                <strong>4 900 DA</strong>
              </div>
              <div className="pt-line">
                <span>Silicone case, black × 2</span>
                <strong>2 400 DA</strong>
              </div>
              <div className="pt-line">
                <span>USB-C fast charger × 1</span>
                <strong>1 700 DA</strong>
              </div>
            </section>
            <section className="pt-card" aria-label="Calls">
              <h4>Confirmation calls · {confirmed ? 'confirmed' : 'attempt 3 of 5'}</h4>
              <div className="pt-line">
                <span>No answer</span>
                <span className="pt-muted">Today, 10:42</span>
              </div>
              <div className="pt-line">
                <span>Asked to call back after 10:30</span>
                <span className="pt-muted">Today, 09:15</span>
              </div>
            </section>
            <section className="pt-card" aria-label="Customer note">
              <h4>Note from the customer</h4>
              <p>“Please call before coming, the building has no name on the door.”</p>
            </section>
          </div>
          {!narrow && (
            <aside className="pt-card pt-inspector" aria-label="Order details">
              <h4>Details</h4>
              <OrderFacts />
            </aside>
          )}
        </div>
      </ScrollArea>
      <Sheet regular="pane" open={detailsOpen && narrow} onOpenChange={setDetailsOpen} label="Order details" title="Details">
        <OrderFacts />
      </Sheet>
    </div>
  )
}

export const meta = {
  title: 'Order detail',
  description:
    'The record in the middle, its details in an inspector at the end. Below 640px the inspector moves into a pane sheet behind the details tool (a sheet on phones); the dock never moves.',
}
