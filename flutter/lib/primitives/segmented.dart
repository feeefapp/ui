import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

import 'segmented_model.dart' show SelectionSemantics;
import 'selection_track.dart';

export 'selection_track.dart' show SelectionOverflow;

/// A status colour for an option's icon.
enum SegmentTone { success, warning, danger }

/// One choice of a segmented control.
class SegmentOption<T> {
  const SegmentOption({
    required this.value,
    required this.label,
    this.icon,
    this.tone,
    this.badge,
    this.disabled = false,
  });

  /// Value reported to `onChange`.
  final T value;

  /// Visible text and accessible name.
  final String label;

  /// Decorative icon before the label.
  final Widget? icon;

  /// Colours the icon (only the icon) with a status token while the option isn't selected; the
  /// selected option's icon takes the pill's ink. Never the only cue: keep it in the label too.
  final SegmentTone? tone;

  /// A short count or tag after the label ("21"), on a small neutral pill in tabular figures. It
  /// is part of the option's accessible name ("New, 21").
  final String? badge;

  /// Skipped by the keyboard and not clickable.
  final bool disabled;
}

/// A single choice among short options, shown side by side in one row: the Flutter twin of
/// `SegmentedControl` in `@feeef.dev/ui/primitives/segmented`. A filled pill marks the selection
/// and slides to the next one; press it and it becomes a glass lens you can drag (or press another
/// option and drag: the pill comes to you). Radio semantics, one Tab stop, arrow keys move and
/// select (mirrored in right-to-left), Home and End jump to the ends. Options can carry a count
/// ([SegmentOption.badge]).
///
/// When the width it is given has no room for every option it folds, like an actions bar spills
/// into More: the other options fold into the selected one, which gains a chevron and opens them
/// as a single-choice menu ([overflow] [SelectionOverflow.menu], the default), and it unfolds as
/// soon as the room is back. A status filter with many options takes [SelectionOverflow.scroll]
/// instead: options that don't fit scroll sideways inside the control (never wrap or squeeze), its
/// edges fade where there is more, the selection scrolls into view whenever it changes, and a pill
/// dragged near an edge scrolls on. On touch a swipe scrolls; a drag that starts on the pill moves
/// the pill. Both need a bounded width: in a [Row] (a [ToolbarGroup]'s too) wrap it in [Flexible].
///
/// It paints no container: put it in glass ([ToolbarGroup]), on a box of your own (a
/// `DecoratedBox` with `colors.surfaceSoft` and `SuperellipseBorder(radius: sizes.radiusControl)`)
/// or leave it bare. [TabView]'s tab bar is the same control with tab semantics.
class SegmentedControl<T> extends StatelessWidget {
  const SegmentedControl({
    super.key,
    required this.value,
    required this.onChange,
    required this.options,
    required this.label,
    this.disabled = false,
    this.equalWidth = false,
    this.overflow = SelectionOverflow.menu,
  });

  /// The selected option's value.
  final T value;

  /// Called with the chosen value on a tap, when a dragged pill is released on another option, and
  /// on every arrow, Home or End key press.
  final ValueChanged<T> onChange;

  /// Choices, in display order.
  final List<SegmentOption<T>> options;

  /// Accessible name of the radio group.
  final String label;

  /// Disables every option.
  final bool disabled;

  /// Fills the available width with one row of equal options whose labels end in an ellipsis (it
  /// never scrolls).
  final bool equalWidth;

  /// When the width it is given has no room for every option: [SelectionOverflow.menu] folds it
  /// into the selected option and a chevron that opens the options as a radio menu;
  /// [SelectionOverflow.scroll] scrolls them inside the control (a status filter with many
  /// options). Ignored with [equalWidth].
  final SelectionOverflow overflow;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(DiagnosticsProperty<T>('value', value))
      ..add(ObjectFlagProperty<ValueChanged<T>>.has('onChange', onChange))
      ..add(IterableProperty<SegmentOption<T>>('options', options))
      ..add(StringProperty('label', label))
      ..add(FlagProperty('disabled', value: disabled, ifTrue: 'disabled'))
      ..add(
        FlagProperty('equalWidth', value: equalWidth, ifTrue: 'equal width'),
      )
      ..add(
        EnumProperty<SelectionOverflow>(
          'overflow',
          overflow,
          defaultValue: SelectionOverflow.menu,
        ),
      );
  }

  @override
  Widget build(BuildContext context) => SelectionTrack<T>(
    semantics: SelectionSemantics.radio,
    value: value,
    onSelect: (next, _) => onChange(next),
    options: options,
    label: label,
    disabled: disabled,
    equalWidth: equalWidth,
    overflow: overflow,
  );
}
