import { useMemo, useState } from 'react'
import { Download, Eye, FileSpreadsheet, FileText, Flag, Tag } from 'lucide-react'
import { LabActionsBar, type LabAction } from '@feeef.dev/ui/actions'

export default function GroupsAndToggles() {
  const [urgent, setUrgent] = useState(false)
  const [hidePaid, setHidePaid] = useState(true)
  const [status, setStatus] = useState('')
  const actions = useMemo<LabAction[]>(
    () => [
      { id: 'urgent', type: 'toggle', label: 'Urgent', icon: <Flag />, checked: urgent, onCheckedChange: setUrgent },
      { id: 'hide-paid', type: 'toggle', label: 'Hide paid', icon: <Eye />, display: 'icon', checked: hidePaid, onCheckedChange: setHidePaid },
      {
        id: 'tag',
        type: 'group',
        label: 'Tag',
        icon: <Tag />,
        actions: [
          { id: 'tag-vip', type: 'action', label: 'VIP customer', onAction: () => setStatus('Tagged VIP customer') },
          { id: 'tag-return', type: 'action', label: 'Return risk', onAction: () => setStatus('Tagged return risk') },
        ],
      },
      {
        id: 'export',
        type: 'group',
        label: 'Export',
        icon: <Download />,
        actions: [
          { id: 'export-csv', type: 'action', label: 'CSV', icon: <FileText />, onAction: () => setStatus('Exported CSV') },
          {
            id: 'export-sheet',
            type: 'group',
            label: 'Spreadsheet',
            icon: <FileSpreadsheet />,
            actions: [
              { id: 'export-xlsx', type: 'action', label: 'Excel (.xlsx)', onAction: () => setStatus('Exported Excel') },
              { id: 'export-sheets', type: 'action', label: 'Google Sheets', disabled: true, onAction: () => {} },
            ],
          },
        ],
      },
    ],
    [urgent, hidePaid]
  )
  return (
    <div className="demo-wide" style={{ display: 'grid', gap: 12 }}>
      <LabActionsBar label="Order list actions" actions={actions} align="start" />
      <p role="status" style={{ margin: 0 }}>
        {status || `Urgent: ${urgent ? 'on' : 'off'} · Hide paid: ${hidePaid ? 'on' : 'off'}`}
      </p>
    </div>
  )
}

export const meta = {
  title: 'Toggles and nested groups',
  description:
    'Toggles are pressed buttons inline and checkbox items in menus. Groups open menus and nest as submenus.',
}
