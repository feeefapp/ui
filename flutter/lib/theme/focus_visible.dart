import 'package:flutter/gestures.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

/// The web's `:focus-visible` for Flutter: focus highlights show after a key press and hide after
/// any pointer press, mouse included. Flutter's automatic strategy keeps them on for a mouse, so
/// every click left a ring. While a [ThemeProvider] is mounted it switches
/// [FocusManager.highlightStrategy] between `alwaysTraditional` (keyboard) and `alwaysTouch`
/// (pointer), so `highlightMode` and `onShowFocusHighlight` follow it everywhere, kit or not.
class FocusVisibility extends StatefulWidget {
  const FocusVisibility({super.key, required this.child});
  final Widget child;

  @override
  State<FocusVisibility> createState() => _FocusVisibilityState();
}

int _users = 0;

bool _onKey(KeyEvent event) {
  if (event is KeyDownEvent) {
    _set(FocusHighlightStrategy.alwaysTraditional);
  }
  return false;
}

void _onPointer(PointerEvent event) {
  if (event is PointerDownEvent) _set(FocusHighlightStrategy.alwaysTouch);
}

void _set(FocusHighlightStrategy strategy) {
  final manager = FocusManager.instance;
  if (manager.highlightStrategy != strategy)
    manager.highlightStrategy = strategy;
}

class _FocusVisibilityState extends State<FocusVisibility> {
  @override
  void initState() {
    super.initState();
    if (_users++ == 0) {
      HardwareKeyboard.instance.addHandler(_onKey);
      GestureBinding.instance.pointerRouter.addGlobalRoute(_onPointer);
    }
  }

  @override
  void dispose() {
    if (--_users == 0) {
      HardwareKeyboard.instance.removeHandler(_onKey);
      GestureBinding.instance.pointerRouter.removeGlobalRoute(_onPointer);
      _set(FocusHighlightStrategy.automatic);
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
