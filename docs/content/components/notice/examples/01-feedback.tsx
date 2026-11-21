import { Notice } from '@feeef.dev/ui/primitives/notice'

export const meta = {
  title: 'Inline warning',
  description: 'Show a warning beside the action it affects.',
}

export default function InlineWarning() {
  return <Notice tone="warning" title="Connection lost">Your draft is saved on this device.</Notice>
}
