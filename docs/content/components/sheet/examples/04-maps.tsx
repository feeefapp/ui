import { useState } from 'react'
import { Home, MapPin, Search, Store, Truck } from 'lucide-react'
import { Sheet } from '@feeef.dev/ui/containers'
import { ListRow, ListSection } from '@feeef.dev/ui/primitives/list'
import { TextField } from '@feeef.dev/ui/primitives/text-field'
import { Device } from '../../../../src/blocks/device'
import { DemoMap } from '../demo-map'

const PLACES = [
  { icon: <Store size={18} />, title: 'Warehouse, Bab Ezzouar', subtitle: '12 orders to pick up' },
  { icon: <Truck size={18} />, title: 'Yalidine hub, Hussein Dey', subtitle: 'Drop-off until 17:00' },
  { icon: <Home size={18} />, title: 'Customer · Amina B.', subtitle: 'Cité 2068 Logements, Bt 12' },
  { icon: <MapPin size={18} />, title: 'Customer · Yacine K.', subtitle: 'Rue Didouche Mourad 41' },
  { icon: <MapPin size={18} />, title: 'Customer · Sara M.', subtitle: 'Kouba, near the market' },
  { icon: <MapPin size={18} />, title: 'Customer · Nadir H.', subtitle: 'El Biar, Bd Bougara' },
]

export default function MapsSheet() {
  const [query, setQuery] = useState('')
  const places = PLACES.filter((p) => p.title.toLowerCase().includes(query.toLowerCase()))
  return (
    <Device label="A phone with a map and a results sheet">
      {(screen) => (
        <>
          <DemoMap />
          <Sheet
            open
            onOpenChange={() => {}}
            label="Deliveries"
            container={screen}
            detents={['peek', 'medium', 'large']}
            dismissible={false}
            backgroundInteraction="medium"
            header={
              <div className="demo-maps-header" data-lab-sheet-handle="">
                <TextField
                  variant="tonal"
                  placeholder="Search deliveries"
                  aria-label="Search deliveries"
                  leadingIcon={<Search size={18} />}
                  value={query}
                  onChange={(event) => setQuery(event.currentTarget.value)}
                />
              </div>
            }
          >
            <ListSection header="Today’s route">
              {places.map((place) => (
                <ListRow key={place.title} leading={place.icon} title={place.title} subtitle={place.subtitle} onClick={() => {}} />
              ))}
            </ListSection>
            <ListSection header="Recent" footer="Drag up for the full list; the map stays usable below medium.">
              {PLACES.slice(0, 4).map((place) => (
                <ListRow key={place.title} leading={place.icon} title={place.title} subtitle="Yesterday" onClick={() => {}} />
              ))}
            </ListSection>
          </Sheet>
        </>
      )}
    </Device>
  )
}

export const meta = {
  title: 'A results sheet over a map',
  description:
    'detents={["peek", "medium", "large"]}, backgroundInteraction="medium", dismissible={false}: at peek only the search field shows and the map stays usable; at medium it still floats on glass, inset from the edges; dragging to large closes the gap and turns it opaque, continuously with the finger. Focusing the search raises it to large.',
}
