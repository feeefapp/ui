import { useState } from 'react'
import { PartyPopper } from 'lucide-react'
import { Button } from '@feeef.dev/ui/primitives/button'
import { Modal } from '@feeef.dev/ui/primitives/modal'

export default function Headerless() {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  return (
    <>
      <Button variant="tonal" onClick={() => setOpen(true)}>
        Publish store
      </Button>
      <Modal open={open} close={close} label="Your store is live" scrollable fitContent headerless>
        <div style={{ display: 'grid', gap: 12, justifyItems: 'center', textAlign: 'center', padding: 12 }}>
          <PartyPopper size={40} aria-hidden="true" />
          <h2 style={{ margin: 0, fontSize: 20 }}>Your store is live</h2>
          <p style={{ margin: 0 }}>Customers can now order at dz-sneakers.feeef.store.</p>
          <div className="demo-row">
            <Button variant="text" onClick={close}>
              Close
            </Button>
            <Button variant="filled" onClick={close}>
              Share link
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

export const meta = {
  title: 'Headerless',
  description:
    'headerless removes the floating header when the content has its own heading and a visible Close.',
}
