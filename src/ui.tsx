/** Stable public facade; implementations remain independently reusable. */
import './system.css'
import './primitives/control-variants.css'
export { Button, IconButton } from './primitives/button'
export { Input, Textarea, Label, Image } from './primitives/fields'
export { Select, Option } from './primitives/select'
export { Modal } from './primitives/modal'
export { ProBadge } from './primitives/badge'
export {
  Box,
  Text,
  Link,
  Form,
  List,
  ListItem,
  Divider,
  Style,
} from './primitives/layout'

export type {
  ButtonProps,
  ButtonVariant,
  ControlSize,
  ButtonAppearance,
} from './primitives/button'

export { SegmentedControl } from './primitives/segmented'
export { Toolbar, ToolbarGroup } from './toolbar'
export type { SegmentOption, SegmentTone } from './primitives/segmented'

export { RawInput } from './primitives/raw-input'
export type { RawInputProps, InputElement, InputValidator } from './primitives/raw-input'
export { TextField } from './primitives/text-field'
export type { TextFieldProps } from './primitives/text-field'

export type { ControlVariant } from './primitives/control-variants'
export type { SelectProps } from './primitives/select'

export { FieldShell } from './primitives/field-shell'
export type {
  FieldShellProps,
  FieldDecorationProps,
  FieldControlState,
} from './primitives/field-shell'

export { PopoverSurface } from './primitives/popover-surface'
export type { PopoverSurfaceProps } from './primitives/popover-surface'

export type { IconButtonProps } from './primitives/button'

export {
  Scaffold,
  ScaffoldSide,
  ScaffoldAppBar,
  ScaffoldTopBar,
  ScaffoldToggleButton,
  useScaffold,
} from './workspace/scaffold'
export type { ScaffoldProps, ScaffoldState, ScaffoldSideMode } from './workspace/scaffold'

export { FilterBar } from './filter-bar'
export type { FilterBarProps, FilterOption, FilterValue } from './filter-bar'

export { Slider, SlideSwitch, SlideSwitchIndicator } from './primitives/slider'
export { NumberField } from './primitives/number-field'
export type { NumberFieldProps } from './primitives/number-field'
export { parseNumberExpression } from './primitives/number-field-core'
export type {
  SliderProps,
  SliderState,
  SliderMark,
  SlideSwitchProps,
} from './primitives/slider'

export {
  TemporalFilterEditor,
  TemporalBody,
  TemporalEdges,
  TemporalPresets,
  useTemporalEditor,
  type TemporalEditorOptions,
  type TemporalEditorState,
} from './filters/temporal-editor'
export { TemporalDialog } from './filters/temporal-dialog'
export { temporalPresets, validateTemporal } from './filters/temporal'
export type {
  TemporalType,
  TemporalValue,
  TemporalPreset,
  TemporalConfig,
} from './filters/temporal'

export { Checkbox, Radio, RadioGroup } from './primitives/choice'
export type {
  CheckboxProps,
  RadioProps,
  RadioGroupProps,
  RadioOption,
} from './primitives/choice'

export {
  TemporalField,
  DateField,
  TimeField,
  DateTimeField,
  DateRangeField,
  TimeRangeField,
  DateTimeRangeField,
} from './primitives/temporal-field'
export type {
  TemporalFieldProps,
  TemporalSingleFieldProps,
  TemporalRangeFieldProps,
} from './primitives/temporal-field'
