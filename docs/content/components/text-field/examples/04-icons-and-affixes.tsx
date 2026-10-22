import { useState } from 'react'
import { Phone, Search, X } from 'lucide-react'
import { IconButton } from '@feeef.dev/ui/primitives/button'
import { TextField } from '@feeef.dev/ui/primitives/text-field'

export default function IconsAndAffixes() {
  const [query, setQuery] = useState('Sneakers')
  return (
    <div className="demo-column">
      <TextField
        aria-label="Search products"
        placeholder="Search products"
        type="search"
        leadingIcon={<Search size={18} />}
        value={query}
        onValueChange={setQuery}
        trailing={
          query && (
            <IconButton variant="text" controlSize="compact" aria-label="Clear search" onClick={() => setQuery('')}>
              <X size={16} />
            </IconButton>
          )
        }
      />
      <TextField
        hint="Phone number"
        type="tel"
        inputMode="tel"
        leadingIcon={<Phone size={18} />}
        leading="+213"
      />
      <TextField hint="Delivery price" inputMode="numeric" defaultValue="600" trailing="DZD" />
    </div>
  )
}

export const meta = {
  title: 'Icons, prefixes and actions',
  description: 'leadingIcon is decorative; leading and trailing hold prefixes, units or a small action. The text inset follows their width.',
}
