import { SlideSwitch, SlideSwitchIndicator } from './slider'
/** Compatibility aliases; new code uses the shared spring controls explicitly. */
export const SwitchIndicator = SlideSwitchIndicator
export function Switch(props: {
  checked: boolean
  onCheckedChange(value: boolean): void
  label: string
  disabled?: boolean
  loading?: boolean
}) {
  return <SlideSwitch {...props} controlSize="compact" />
}
