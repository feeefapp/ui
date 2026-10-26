import 'package:feeef_ui/icons/lucide.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('icon outlines come from lucide-react data in its 24 × 24 view box', () {
    // plus: "M5 12h14" and "M12 5v14".
    expect(
      LucideIcons.plus.path.getBounds(),
      const Rect.fromLTRB(5, 5, 19, 19),
    );
    // circle: <circle cx="12" cy="12" r="10"/>.
    expect(
      LucideIcons.circle.path.getBounds(),
      const Rect.fromLTRB(2, 2, 22, 22),
    );
    // Old names point at the same icon, as in lucide-react.
    expect(identical(LucideIcons.trash2, LucideIcons.trash), isTrue);
  });

  testWidgets('icons size from IconTheme, are decorative unless labelled', (
    tester,
  ) async {
    final handle = tester.ensureSemantics();
    await tester.pumpWidget(
      const Directionality(
        textDirection: TextDirection.ltr,
        child: Center(
          child: IconTheme(
            data: IconThemeData(size: 18),
            child: LucideSearch(),
          ),
        ),
      ),
    );
    expect(tester.getSize(find.byType(LucideSearch)), const Size(18, 18));
    expect(find.bySemanticsLabel(RegExp('.')), findsNothing);
    await tester.pumpWidget(
      const Directionality(
        textDirection: TextDirection.ltr,
        child: Center(child: LucideSearch(semanticLabel: 'Search')),
      ),
    );
    expect(find.bySemanticsLabel('Search'), findsOneWidget);
    handle.dispose();
  });
}
