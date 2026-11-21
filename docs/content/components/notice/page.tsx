import { Notice } from '@feeef.dev/ui/primitives/notice'
import { definePage, examplesFrom } from '../../../src/model'
import { Section } from '../../../src/blocks/prose'
import InlineWarning from './examples/01-feedback'

export default definePage({
  section: 'components', id: 'notice', title: 'Notice', group: 'Feedback and motion', order: 5,
  summary: 'Inline guidance, alerts and status messages with a colored accent, icon and optional heading.',
  importLine: "import { Notice } from '@feeef.dev/ui/primitives/notice'",
  source: 'src/primitives/notice.tsx', api: ['Notice'],
  keywords: ['callout', 'alert', 'status', 'feedback', 'guidance'],
  Overview: () => <>
    <Section title="Usage">
      <p>Place a notice beside the content it describes. Use info for guidance, success for confirmation,
        warning for a recoverable problem and danger for an error that needs attention.
        The body accepts text, lists, links and actions.</p>
      <InlineWarning />
    </Section>
    <Section title="Accessibility">
      <p>Describe the outcome in words. The stripe and icon are decorative. Static notices are quiet.
        For a message that changes after an action, use <code>role="status"</code> on the web or
        <code> liveRegion: true</code> in Flutter. Reserve <code>role="alert"</code> for urgent updates.</p>
    </Section>
  </>,
  Preview: () => <Notice tone="success" title="Changes saved">Your draft is up to date.</Notice>,
  examples: examplesFrom(
    import.meta.glob('./examples/*.tsx', { eager: true }),
    import.meta.glob('./examples/*.tsx', { eager: true, query: '?raw', import: 'default' }),
    import.meta.glob('./examples/*.dart', { eager: true, query: '?raw', import: 'default' })
  ),
})
