import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets(
    'focus highlights follow :focus-visible: keys show them, any press hides them',
    (tester) async {
      await tester.pumpWidget(
        const Directionality(
          textDirection: TextDirection.ltr,
          child: ThemeProvider(child: SizedBox.expand()),
        ),
      );
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      expect(
        FocusManager.instance.highlightMode,
        FocusHighlightMode.traditional,
      );
      // A mouse click too: Flutter's own strategy would keep the ring for a mouse.
      await tester.tapAt(const Offset(10, 10), kind: PointerDeviceKind.mouse);
      expect(FocusManager.instance.highlightMode, FocusHighlightMode.touch);
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowDown);
      expect(
        FocusManager.instance.highlightMode,
        FocusHighlightMode.traditional,
      );
      await tester.pumpWidget(const SizedBox());
      expect(
        FocusManager.instance.highlightStrategy,
        FocusHighlightStrategy.automatic,
      );
    },
  );
}
