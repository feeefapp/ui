import { useState } from 'react'
import { SlideSwitchIndicator } from '@feeef.dev/ui/primitives/slider'

const COLUMNS = ['Customer', 'Phone', 'Wilaya', 'Courier', 'Total']

export default function MenuIndicator() {
  const [visible, setVisible] = useState<string[]>(['Customer', 'Wilaya', 'Total'])
  const toggle = (column: string) =>
    setVisible((list) => (list.includes(column) ? list.filter((c) => c !== column) : [...list, column]))
  return (
    <div
      role="menu"
      aria-label="Visible columns"
      style={{ display: 'grid', gap: 2, width: 240, padding: 6, border: '1px solid var(--lab-line)', borderRadius: 16 }}
    >
      {COLUMNS.map((column) => (
        <button
          key={column}
          type="button"
          role="menuitemcheckbox"
          aria-checked={visible.includes(column)}
          onClick={() => toggle(column)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 10px',
            border: 0,
            borderRadius: 10,
            background: 'transparent',
            color: 'inherit',
            font: 'inherit',
            cursor: 'pointer',
          }}
        >
          {column}
          <SlideSwitchIndicator checked={visible.includes(column)} />
        </button>
      ))}
    </div>
  )
}

export const meta = {
  title: 'Indicator in a menu',
  description:
    'The menu item owns the checked state and the click; SlideSwitchIndicator only draws it, so there is no nested control.',
}
