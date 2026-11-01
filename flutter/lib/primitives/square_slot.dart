import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

import '../theme.dart';

/// A square as tall as its row with its content centred: the leading icon or the trailing badge,
/// count or chevron of a row. The twin of `SquareSlot` in `@feeef.dev/ui/primitives/square-slot`.
///
/// As a direct child of a `Button` it is the button's height and takes the place of the padding
/// at the end it sits on, so an icon sits centred in a square at the button's edge (a button that
/// holds only a slot is that square), and icons take an icon button's size. `ListRow` uses it for
/// its leading media at 32px. [size] gives it another side.
class SquareSlot extends StatelessWidget {
  const SquareSlot({super.key, this.size, required this.child});

  /// The side (px). Null takes the host's ([SquareSlotScope]: a button's height), else the regular
  /// control height.
  final double? size;
  final Widget child;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties.add(DoubleProperty('size', size, defaultValue: null));
  }

  @override
  Widget build(BuildContext context) {
    final scope = SquareSlotScope.maybeOf(context);
    final side =
        size ?? scope?.size ?? ThemeProvider.of(context).sizes.controlHeight;
    Widget content = Center(child: child);
    final icon = scope?.iconSize;
    if (icon != null) {
      content = IconTheme.merge(
        data: IconThemeData(size: icon),
        child: content,
      );
    }
    return SizedBox.square(dimension: side, child: content);
  }
}

/// The side and icon size a host gives the [SquareSlot]s inside it: a `Button` sets its height and
/// an icon button's icon size (`--lab-square-slot-size` in the web kit).
class SquareSlotScope extends InheritedWidget {
  const SquareSlotScope({
    super.key,
    required this.size,
    this.iconSize,
    required super.child,
  });

  final double size;
  final double? iconSize;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(DoubleProperty('size', size))
      ..add(DoubleProperty('iconSize', iconSize, defaultValue: null));
  }

  static SquareSlotScope? maybeOf(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<SquareSlotScope>();

  @override
  bool updateShouldNotify(SquareSlotScope old) =>
      old.size != size || old.iconSize != iconSize;
}
