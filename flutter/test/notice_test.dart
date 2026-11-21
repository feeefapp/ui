import 'package:feeef_ui/primitives/notice.dart';
import 'package:feeef_ui/theme.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets(
    'the accent follows reading direction and announcements are opt-in',
    (tester) async {
      for (final dir in TextDirection.values) {
        await tester.pumpWidget(
          WidgetsApp(
            color: const Color(0xff000000),
            builder: (_, _) => Directionality(
              textDirection: dir,
              child: ThemeProvider(
                child: Center(
                  child: SizedBox(
                    width: 280,
                    child: Notice(
                      tone: NoticeTone.warning,
                      liveRegion: dir == TextDirection.rtl,
                      title: const Text('Offline'),
                      child: const Text('Draft saved.'),
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
        final host = find.byType(Notice);
        final stripe = find.descendant(
          of: host,
          matching: find.byType(PositionedDirectional),
        );
        final body = tester.getRect(find.text('Draft saved.'));
        final bar = tester.getRect(stripe);
        expect(
          dir == TextDirection.ltr
              ? bar.right < body.left
              : bar.left > body.right,
          isTrue,
        );
        final semantics = tester.widgetList<Semantics>(
          find.descendant(of: host, matching: find.byType(Semantics)),
        );
        expect(
          semantics.any((w) => w.properties.liveRegion == true),
          dir == TextDirection.rtl,
        );
      }
    },
  );
}
