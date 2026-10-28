import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('glass that cannot bend frosts at twice the measured blur, whatever the tint', () {
    for (final side in [32.0, 64.0, 200.0]) {
      final frosted = glassFrostedBlur(side);
      expect(frosted, glassBlur(side) * glassFrostedBlurScale);
      for (final tint in [0.0, 0.5, 1.0]) {
        expect(
          glassKindBlur(
            GlassKind.regular,
            side,
            tint,
            blurOn: false,
            frosted: true,
          ),
          frosted,
        );
        // Frosting never thins a blur that is already stronger.
        expect(
          glassKindBlur(
            GlassKind.menu,
            side,
            tint,
            blurOn: true,
            frosted: true,
          ),
          greaterThanOrEqualTo(frosted),
        );
      }
      expect(
        glassKindBlur(GlassKind.regular, side, 0.5, blurOn: false),
        lessThan(frosted),
      );
    }
  });
}
