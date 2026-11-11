import * as React from 'react'
import { createRoot } from 'react-dom/client'
import { RefreshCw, ListFilter, X } from 'lucide-react'
import { Provider } from '../src/provider'
import { Scaffold } from '../src/workspace/scaffold'
import { Panel, PanelHost } from '../src/containers/panel-host'
import { ToolbarGroup } from '../src/toolbar'
import { Checkbox } from '../src/primitives/choice'
import { IconButton } from '../src/primitives/button'

function Fixture() {
  const [checked, setChecked] = React.useState(false)
  const setTheme = (value: 'light' | 'dark') => { document.documentElement.dataset.labTheme = value }
  const [dir, setDir] = React.useState<'ltr' | 'rtl'>('ltr')
  React.useEffect(() => { Object.assign(window, { toolbarFixture: { setTheme, setDir } }) }, [])
  const tools = <div style={{ display: 'flex', gap: 8 }}>
    <ToolbarGroup label="Selection"><Checkbox aria-label="Select all" checked={checked} onCheckedChange={setChecked} /></ToolbarGroup>
    <ToolbarGroup label="Filters"><IconButton variant="text" appearance="toolbar" aria-label="Filter"><ListFilter /></IconButton></ToolbarGroup>
    <ToolbarGroup label="Refresh"><IconButton variant="text" appearance="toolbar" controlSize="small" aria-label="Refresh"><RefreshCw /></IconButton></ToolbarGroup>
    <ToolbarGroup label="Close"><IconButton variant="text" appearance="toolbar" aria-label="Close"><X /></IconButton></ToolbarGroup>
  </div>
  return <Provider initialTheme="dark" theme={{ motion: 'none' }}>
    <div dir={dir} style={{ height: '100dvh' }}><Scaffold dir={dir} contentSurface="none" side={<p>Navigation</p>} defaultSideMode="rail"
      renderViewport={() => <PanelHost panels={[
        { id: 'list', minWidth: 280, panel: <Panel label="Deposits" header={tools}><h1>Deposits</h1><p>Each panel owns its surface.</p></Panel> },
        { id: 'detail', minWidth: 280, panel: <Panel label="Deposit" title="Deposit"><h1>Deposit details</h1></Panel> },
      ]} onPanelsChange={() => {}} />} >{null}</Scaffold></div>
  </Provider>
}
createRoot(document.getElementById('root')!).render(<Fixture />)
