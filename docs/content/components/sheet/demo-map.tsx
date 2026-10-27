/** A pretend street map for sheet demos: colourful enough to show the glass. */
export function DemoMap() {
  return (
    <div className="demo-fill demo-map" aria-hidden="true">
      <span className="demo-map-pin" style={{ insetInlineStart: '22%', top: '18%' }} />
      <span className="demo-map-pin" style={{ insetInlineStart: '64%', top: '30%' }} />
      <span className="demo-map-pin" style={{ insetInlineStart: '40%', top: '46%' }} />
      <span className="demo-map-pin" style={{ insetInlineStart: '78%', top: '58%' }} />
    </div>
  )
}

