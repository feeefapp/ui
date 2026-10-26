import { useState } from 'react'
import { ScrollArea } from '@feeef.dev/ui/scroll'
import { Dock } from '@feeef.dev/ui/dock'
import { Button } from '@feeef.dev/ui/primitives/button'
import '../scroll-demo.css'

const TERMS = Array.from(
  { length: 10 },
  (_, i) =>
    `${i + 1}. Orders are paid in cash on delivery. The courier collects the amount shown on the parcel and the store receives it with the next remittance.`
)

export default function ViewportProps() {
  const [progress, setProgress] = useState(0)
  return (
    <div className="scroll-demo-frame">
      <ScrollArea
        label="Seller terms"
        contentPadding={20}
        viewportProps={{
          onScroll: (event) => {
            const el = event.currentTarget
            const max = el.scrollHeight - el.clientHeight
            setProgress(max > 0 ? Math.round((el.scrollTop / max) * 100) : 100)
          },
        }}
        bottom={
          <Dock label="Terms actions" content={<span>{progress}% read</span>}>
            <Button variant="filled" disabled={progress < 100}>
              Accept terms
            </Button>
          </Dock>
        }
      >
        {TERMS.map((term) => (
          <p key={term}>{term}</p>
        ))}
      </ScrollArea>
    </div>
  )
}

export const meta = {
  title: 'Listening to the viewport',
  description:
    'viewportProps go to the element that scrolls (the forwarded ref points there too). Here onScroll drives a reading progress label.',
}
