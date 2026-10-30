import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:feeef_ui/feeef_ui.dart';

import 'widgets_test.dart' show host;

void main() {
  testWidgets(
    'compact resize gives the viewport its full width on the first frame',
    (tester) async {
      var compact = false;
      late StateSetter update;
      double width = 0;
      await tester.pumpWidget(
        host(
          Navigator(
            onGenerateRoute: (_) => PageRouteBuilder(
              pageBuilder: (context, animation, secondary) => StatefulBuilder(
                builder: (context, setState) {
                  update = setState;
                  return SizedBox(
                    width: compact ? 360 : 800,
                    height: 600,
                    child: Scaffold(
                      compact: compact,
                      side: const SizedBox(),
                      renderViewport: (context, top, bottom) => LayoutBuilder(
                        builder: (context, box) {
                          width = box.maxWidth;
                          return const SizedBox();
                        },
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      update(() => compact = true);
      await tester.pump();
      expect(
        width,
        greaterThan(300),
        reason: 'An exiting desktop sidebar must not squeeze a phone viewport',
      );
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    },
  );
}
