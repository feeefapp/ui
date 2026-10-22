import { useState } from 'react'
import { Copy, MessageSquare, Phone, PhoneOff } from 'lucide-react'
import { Sheet } from '@feeef.dev/ui/containers'
import { ListRow, ListSection } from '@feeef.dev/ui/primitives/list'
import { Button } from '@feeef.dev/ui/primitives/button'
import { Device } from '../../../../src/blocks/device'

export default function ContactSheet() {
  const [open, setOpen] = useState(false)
  const [last, setLast] = useState('No action yet.')
  const act = (what: string) => {
    setLast(what)
    setOpen(false)
  }
  return (
    <Device label="A phone with a contact sheet" height={640}>
      {(screen) => (
        <>
          <div className="demo-fill demo-sheet-page">
            <p>Amina Benali · 0555 12 34 56</p>
            <Button variant="filled" onClick={() => setOpen(true)}>
              <Phone size={18} /> Contact customer
            </Button>
            <p className="demo-sheet-status" role="status">
              {last}
            </p>
          </div>
          <Sheet open={open} onOpenChange={setOpen} label="Contact Amina Benali" container={screen} detents={['fit']}>
            <ListSection header="Amina Benali">
              <ListRow leading={<Phone />} title="Call" subtitle="0555 12 34 56" onClick={() => act('Calling…')} />
              <ListRow leading={<MessageSquare />} title="Send SMS" onClick={() => act('SMS sent.')} />
              <ListRow leading={<Copy />} title="Copy number" onClick={() => act('Number copied.')} />
              <ListRow leading={<PhoneOff />} title="Mark as unreachable" onClick={() => act('Marked unreachable.')} />
            </ListSection>
          </Sheet>
        </>
      )}
    </Device>
  )
}

export const meta = {
  title: 'Fit to content',
  description:
    'detents={["fit"]} sizes the sheet to its content (up to full height): a short action sheet. With one detent there is no grabber; drag anywhere down to close.',
}
