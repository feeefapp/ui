import 'package:flutter/widgets.dart';

import 'slider.dart';

/// Compatibility alias of `@feeef.dev/ui/primitives/switch`; new code uses [SlideSwitchIndicator].
typedef SwitchIndicator = SlideSwitchIndicator;

/// An on/off switch: the twin of `Switch` in `@feeef.dev/ui/primitives/switch`, a [SlideSwitch].
/// New code uses SlideSwitch explicitly.
class Switch extends StatelessWidget {
  const Switch({
    super.key,
    required this.checked,
    required this.onCheckedChange,
    required this.label,
    this.disabled = false,
    this.loading = false,
  });

  /// The state (controlled).
  final bool checked;

  /// Called with the next state.
  final ValueChanged<bool> onCheckedChange;

  /// Accessible name. Not rendered.
  final String label;
  final bool disabled;

  /// Disables the switch and marks it busy while a change is saving.
  final bool loading;

  @override
  Widget build(BuildContext context) => SlideSwitch(
    label: label,
    checked: checked,
    onCheckedChange: onCheckedChange,
    disabled: disabled,
    loading: loading,
  );
}
