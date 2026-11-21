import { ListSection } from '@feeef.dev/ui/primitives/list'
import { Checkbox } from '@feeef.dev/ui/primitives/choice'
import { useState } from 'react'

const payouts = [
  { id: '1042', name: 'Amina Benali', amount: '12,450.00 DA · due today' },
  { id: '1043', name: 'Yacine Haddad', amount: '3,900.00 DA · due Friday' },
  { id: '1044', name: 'Sara Meziane', amount: '820.00 DA' },
]

export default function SelectRows() {
  const [selected, setSelected] = useState<string[]>(['1042'])
  const toggle = (id: string, on: boolean) =>
    setSelected((ids) => (on ? [...ids, id] : ids.filter((other) => other !== id)))
  return (
    <div className="demo-wide">
      <ListSection header="Courier payouts">
        {payouts.map((payout) => (
          <div key={payout.id} role="listitem">
            <Checkbox
              containerClassName="demo-choice-row"
              checked={selected.includes(payout.id)}
              onCheckedChange={(on) => toggle(payout.id, on)}
              label={
                <span className="demo-choice-details">
                  <span>{payout.name}<small>Payout #{payout.id}</small></span>
                  <span>{payout.amount}</span>
                </span>
              }
            />
          </div>
        ))}
      </ListSection>
    </div>
  )
}

export const meta = {
  title: 'Selection and wide values',
  description:
    'Click the mark, name, amount or padding to toggle a payout. Each row has one keyboard stop.',
}
