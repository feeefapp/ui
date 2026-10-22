import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('artwork motifs have their view boxes and stay seeded', () {
    final wave = artworkPixels(PixelVariant.wave, 'spring-collection');
    expect((wave.width, wave.height), (128, 64));
    final orbit = artworkPixels(PixelVariant.orbit, 'spring-collection');
    expect((orbit.width, orbit.height), (96, 96));
    expect(orbit.pixels, isNotEmpty);
    expect(
      artworkPixels(PixelVariant.spark, 'a').pixels.length,
      artworkPixels(PixelVariant.spark, 'a').pixels.length,
    );
  });

  testWidgets(
    'PixelArtwork sizes by aspect and is decorative without a title',
    (tester) async {
      await tester.pumpWidget(
        const ThemeProvider(
          child: Directionality(
            textDirection: TextDirection.ltr,
            child: Center(
              child: PixelArtwork(variant: PixelVariant.wave, size: 64),
            ),
          ),
        ),
      );
      expect(tester.getSize(find.byType(CustomPaint).last), const Size(64, 32));
      final handle = tester.ensureSemantics();
      expect(find.bySemanticsLabel('x'), findsNothing);
      handle.dispose();
    },
  );

  testWidgets('PixelTexture fills its parent', (tester) async {
    await tester.pumpWidget(
      const ThemeProvider(
        child: Directionality(
          textDirection: TextDirection.ltr,
          child: Center(
            child: SizedBox(width: 200, height: 80, child: PixelTexture()),
          ),
        ),
      ),
    );
    expect(tester.getSize(find.byType(PixelTexture)), const Size(200, 80));
  });
}
