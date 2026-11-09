import 'package:feeef_ui/containers/sheet.dart';
import 'package:feeef_ui/presentation/routes.dart';
import 'package:feeef_ui/theme.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('rounded full-height surface exposes all four corners', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(
      ThemeProvider(
        child: Directionality(
          textDirection: TextDirection.ltr,
          child: MediaQuery(
            data: const MediaQueryData(size: Size(390, 800)),
            child: Navigator(
              onGenerateRoute: (_) => PageRouteBuilder<void>(
                pageBuilder: (context, _, _) => Builder(
                  builder: (context) {
                    return GestureDetector(
                      onTap: () => showSheet<void>(
                        context,
                        builder: (_) => const Sheet(
                          label: 'Rounded',
                          roundedBottom: true,
                          regular: SheetRegular.sheet,
                          detents: [SheetDetent.medium, SheetDetent.large],
                          defaultDetent: SheetDetent.large,
                          child: SizedBox(height: 600, child: Text('Body')),
                        ),
                      ),
                      child: const Text('Open'),
                    );
                  },
                ),
              ),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('Open'));
    await tester.pumpAndSettle();
    final surfaces = tester.widgetList<SheetSurface>(find.byType(SheetSurface));
    expect(surfaces, isNotEmpty);
    for (final surface in surfaces) {
      expect(surface.radii[2], greaterThan(0));
      expect(surface.radii[3], greaterThan(0));
    }
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pump(const Duration(seconds: 1));
  });
  test(
    'rounded sheets retain the lower corners and safe gap at full height',
    () {
      for (final mode in [SheetFrameMode.float, SheetFrameMode.attached]) {
        for (final visible in [400.0, 600.0, 790.0]) {
          final frame = sheetFrame(
            visible,
            heights: const [400, 790],
            large: 790,
            inset: 8,
            radius: 32,
            mode: mode,
            roundedBottom: true,
          );
          expect(frame.gap, greaterThanOrEqualTo(8));
          expect(frame.bottomRadius, 32);
        }
      }
    },
  );

  test('default attached geometry remains unchanged', () {
    final frame = sheetFrame(
      790,
      heights: const [400, 790],
      large: 790,
      inset: 8,
      radius: 32,
      mode: SheetFrameMode.attached,
    );
    expect(frame.gap, 0);
    expect(frame.bottomRadius, 0);
  });
}
