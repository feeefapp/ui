import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart' hide RadioGroup;
import 'package:flutter_test/flutter_test.dart';

import 'widgets_test.dart' show host;

void main() {
  test('glass strengths default to the measured look and clamp to 0–10', () {
    const config = ThemeConfig();
    expect(config.refractionStrength, 1);
    expect(config.highlight, 1);
    expect(config.highlightWidth, 1);
    expect(config.glassBarBoost, isTrue);
    final wild = config.copyWith(
      glassRefractionStrength: 40,
      glassHighlight: -2,
      glassHighlightWidth: double.nan,
    );
    expect(wild.refractionStrength, 10);
    expect(wild.highlight, 0);
    expect(wild.highlightWidth, 1);
  });

  Future<ThemeConfig> barConfig(WidgetTester tester, ThemeConfig config) async {
    late ThemeConfig seen;
    await tester.pumpWidget(
      host(
        GlassBar(
          child: Builder(
            builder: (context) {
              seen = ThemeProvider.of(context).config;
              return const SizedBox();
            },
          ),
        ),
        config: config,
      ),
    );
    return seen;
  }

  testWidgets('bars raise tint and blur unless the theme turns the boost off', (
    tester,
  ) async {
    const theme = ThemeConfig(glassTint: 0.1);
    final boosted = await barConfig(tester, theme);
    expect(boosted.glassBlur, isTrue);
    expect(boosted.tint, greaterThan(0.1));
    final plain = await barConfig(tester, theme.copyWith(glassBarBoost: false));
    expect(plain.glassBlur, isFalse);
    expect(plain.tint, 0.1);
  });
}
