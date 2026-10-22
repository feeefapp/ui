/** Stable public facade; implementations remain independently reusable. */
import './system.css'
import './primitives/control-variants.css'
export { LabSwitch, LabSwitchIndicator } from './primitives/switch'
export { LabButton, LabIconButton } from './primitives/button'
export { LabInput, LabTextarea, LabLabel, LabImage } from './primitives/fields'
export { LabSelect, LabOption } from './primitives/select'
export { LabModal } from './primitives/modal'
export { LabProBadge } from './primitives/badge'
export {
  LabBox,
  LabText,
  LabLink,
  LabForm,
  LabList,
  LabListItem,
  LabDivider,
  LabStyle,
} from './primitives/layout'

export type {
  LabButtonProps,
  LabButtonVariant,
  LabControlSize,
  LabButtonAppearance,
} from './primitives/button'

export { LabSegmentedControl } from './primitives/segmented'
export { LabToolbar, LabToolbarGroup } from './toolbar'
export type { LabSegmentOption } from './primitives/segmented'

export { LabRawInput } from './primitives/raw-input'
export type { LabRawInputProps, LabInputElement, LabInputValidator } from './primitives/raw-input'
export { LabTextField } from './primitives/text-field'
export type { LabTextFieldProps } from './primitives/text-field'

export type { LabControlVariant } from './primitives/control-variants'
export type { LabSelectProps } from './primitives/select'

export { LabFieldShell } from './primitives/field-shell'
export type {
  LabFieldShellProps,
  LabFieldDecorationProps,
  LabFieldControlState,
} from './primitives/field-shell'

export { LabPopoverSurface } from './primitives/popover-surface'
export type { LabPopoverSurfaceProps } from './primitives/popover-surface'

export type { LabIconButtonProps } from './primitives/button'

export {
  LabScaffold,
  LabScaffoldSide,
  LabScaffoldAppBar,
  LabScaffoldTopBar,
  LabScaffoldToggleButton,
  useLabScaffold,
} from './workspace/scaffold'
export type { LabScaffoldProps, LabScaffoldState, LabScaffoldSideMode } from './workspace/scaffold'

export { LabFilterBar } from './filter-bar'
export type { LabFilterBarProps, LabFilterOption, LabFilterValue } from './filter-bar'

export { LabSlider, LabSlideSwitch, LabSlideSwitchIndicator } from './primitives/slider'
export { LabNumberField } from './primitives/number-field'
export type { LabNumberFieldProps } from './primitives/number-field'
export { parseNumberExpression } from './primitives/number-field-core'
export type {
  LabSliderProps,
  LabSliderState,
  LabSliderMark,
  LabSlideSwitchProps,
} from './primitives/slider'

export {
  LabTemporalFilterEditor,
  LabTemporalBody,
  LabTemporalEdges,
  LabTemporalPresets,
  useLabTemporalEditor,
  type LabTemporalEditorOptions,
  type LabTemporalEditorState,
} from './filters/temporal-editor'
export { LabTemporalDialog } from './filters/temporal-dialog'
export { temporalPresets, validateTemporal } from './filters/temporal'
export type {
  LabTemporalType,
  LabTemporalValue,
  LabTemporalPreset,
  LabTemporalConfig,
} from './filters/temporal'

export { LabCheckbox, LabRadio, LabRadioGroup } from './primitives/choice'
export type {
  LabCheckboxProps,
  LabRadioProps,
  LabRadioGroupProps,
  LabRadioOption,
} from './primitives/choice'

export {
  LabTemporalField,
  LabDateField,
  LabTimeField,
  LabDateTimeField,
  LabDateRangeField,
  LabTimeRangeField,
  LabDateTimeRangeField,
} from './primitives/temporal-field'
export type {
  LabTemporalFieldProps,
  LabTemporalSingleFieldProps,
  LabTemporalRangeFieldProps,
} from './primitives/temporal-field'
