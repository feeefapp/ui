import { useState } from 'react'
import { MapPin } from 'lucide-react'
import { ListRow, ListSection } from '@feeef.dev/ui/primitives/list'

export default function DeliveryRoute() {
  const [stops, setStops] = useState([
    { id: 'a', name: 'Amina Benali', place: 'Bab Ezzouar' },
    { id: 'b', name: 'Yacine Haddad', place: 'Hydra' },
    { id: 'c', name: 'Sara Meziane', place: 'El Biar' },
    { id: 'd', name: 'Karim Saidi', place: 'Kouba' },
    { id: 'e', name: 'Lina Cherif', place: 'Cheraga' },
  ])
  return (
    <div className="demo-wide">
      <ListSection
        header="Today’s route"
        footer="Drag a grip to change the order, or focus it and use the up and down arrow keys."
        onReorder={(from, to) =>
          setStops((list) => {
            const next = [...list]
            const [moved] = next.splice(from, 1)
            next.splice(to, 0, moved)
            return next
          })
        }
      >
        {stops.map((s, i) => (
          <ListRow key={s.id} static leading={<MapPin />} title={`${i + 1}. ${s.name}`} subtitle={s.place} reorderLabel={`Reorder ${s.name}`} />
        ))}
      </ListSection>
    </div>
  )
}

export const meta = {
  title: 'Reorder',
  description:
    'onReorder gives every row a grip. The dragged row lifts and follows the pointer, the others part around it, and it springs into its new place.',
}
