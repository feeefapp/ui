import 'package:feeef_ui/primitives/chip.dart';
import 'package:feeef_ui/theme.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

Widget _host(Widget child) => WidgetsApp(
  color: const Color(0xff000000),
  builder: (_, _) => Directionality(
    textDirection: TextDirection.ltr,
    child: ThemeProvider(child: Center(child: child)),
  ),
);

void main() {
  testWidgets('a chip is a small control; an icon chip is square', (
    tester,
  ) async {
    await tester.pumpWidget(
      _host(
        const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Chip(key: Key('label'), label: 'Confirmed'),
            Chip(
              key: Key('icon'),
              leading: SizedBox.square(dimension: 14),
              semanticLabel: 'Note',
            ),
          ],
        ),
      ),
    );
    final small = ThemeProvider.of(
      tester.element(find.byKey(const Key('label'))),
    ).sizes.controlSmall;
    expect(tester.getSize(find.byKey(const Key('label'))).height, small);
    expect(tester.getSize(find.byKey(const Key('icon'))), Size.square(small));
  });

  testWidgets('taps reach onPressed; a passive chip is not a button', (
    tester,
  ) async {
    var taps = 0;
    await tester.pumpWidget(_host(Chip(label: 'Tag', onPressed: () => taps++)));
    await tester.tap(find.text('Tag'));
    expect(taps, 1);
    expect(
      tester.getSemantics(find.byType(Chip)),
      matchesSemantics(
        isButton: true,
        label: 'Tag',
        hasTapAction: true,
        hasFocusAction: true,
        isFocusable: true,
      ),
    );

    await tester.pumpWidget(_host(const Chip(label: 'Flag')));
    expect(
      tester.getSemantics(find.byType(Chip)),
      isNot(matchesSemantics(isButton: true)),
    );
  });

  testWidgets('a filled chip writes in readable ink on its colour', (
    tester,
  ) async {
    await tester.pumpWidget(
      _host(
        const Chip(
          variant: ChipVariant.filled,
          color: Color(0xff1f7a3a),
          label: 'Shipped',
        ),
      ),
    );
    final style = DefaultTextStyle.of(tester.element(find.text('Shipped')));
    expect(style.style.color, Chip.filledInk(const Color(0xff1f7a3a)));
  });
}
