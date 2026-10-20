import { LabSlideSwitch, LabSlideSwitchIndicator } from './slider'
/** Compatibility aliases; new code uses the shared spring controls explicitly. */
export const LabSwitchIndicator = LabSlideSwitchIndicator
export function LabSwitch(props: {
  checked: boolean
  onCheckedChange(value: boolean): void
  label: string
  disabled?: boolean
  loading?: boolean
}) {
  return <LabSlideSwitch {...props} controlSize="compact" />
}
