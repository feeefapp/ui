import { useState } from 'react'
import { LabFilterBar, type LabFilterOption } from '@feeef.dev/ui/filter-bar'
import { LabScrollArea } from '@feeef.dev/ui/scroll'
import '../filter-demo.css'

const OPTIONS: LabFilterOption[] = [
  { id: 'unpaid', label: 'Unpaid', keywords: ['cash', 'not paid'] },
  { id: 'returned', label: 'Returned', keywords: ['refused'] },
  { id: 'express', label: 'Express delivery', keywords: ['express', 'fast'] },
]

// Your app supplies the parser: a keyword matcher here, a model call in production.
async function parse(text: string) {
  const words = text.toLowerCase()
  if (/\b(all|everything|clear)\b/.test(words)) return []
  const ids = OPTIONS.filter((option) =>
    [option.label, ...(option.keywords ?? [])].some((word) => words.includes(word.toLowerCase()))
  ).map((option) => option.id)
  if (!ids.length) throw new Error('Try “unpaid express orders”, “refused orders” or “show all”.')
  return ids
}

export default function Natural() {
  const [enabled, setEnabled] = useState<string[]>([])
  return (
    <div className="filter-demo-frame">
      <LabScrollArea
        label="Orders"
        top={
          <LabFilterBar
            label="Order filters"
            options={OPTIONS}
            value={enabled}
            onChange={setEnabled}
            onNaturalFilter={parse}
          />
        }
      >
        <p className="filter-demo-empty">
          Enabled filters: {enabled.length ? enabled.join(', ') : 'none'}. Use the sparkle button and type
          a sentence.
        </p>
      </LabScrollArea>
    </div>
  )
}

export const meta = {
  title: 'Describe a filter',
  description:
    'onNaturalFilter adds a sparkle button. Return the on/off filter ids to enable (empty clears) or throw to show a message under the field.',
}
