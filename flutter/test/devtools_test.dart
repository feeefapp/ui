import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  tearDown(() => KitDevTools.themeOverride.value = null);

  group('ThemeOverride.fromParameters', () {
    test('reads enums, numbers, flags and colours', () {
      final override = ThemeOverride.fromParameters({
        'brightness': 'dark',
        'palette': 'mono',
        'primary': '#3366ff',
        'density': 'compact',
        'radius': '0.5',
        'glass': 'solid',
        'glassBlur': 'true',
        'motion': 'none',
        'performance': 'light',
        'isolateId': 'isolates/1',
      });
      expect(override.toJson(), {
        'brightness': 'dark',
        'palette': 'mono',
        'primary': '#3366ff',
        'density': 'compact',
        'radius': 0.5,
        'glass': 'solid',
        'glassBlur': true,
        'motion': 'none',
        'performance': 'light',
      });
      expect(ThemeOverride.fromParameters({'palette': ''}).isEmpty, isTrue);
    });

    test('rejects unknown values', () {
      expect(
        () => ThemeOverride.fromParameters({'palette': 'neon'}),
        throwsFormatException,
      );
      expect(
        () => ThemeOverride.fromParameters({'radius': 'big'}),
        throwsFormatException,
      );
      expect(
        () => ThemeOverride.fromParameters({'primary': 'red'}),
        throwsFormatException,
      );
    });
  });

  testWidgets('every provider applies the override; dark islands keep theirs', (
    tester,
  ) async {
    late ThemeData outer, island, follower;
    await tester.pumpWidget(
      ThemeProvider(
        brightness: Brightness.light,
        child: Builder(
          builder: (context) {
            outer = ThemeProvider.of(context);
            return Column(
              children: [
                ThemeProvider(
                  brightness: Brightness.light,
                  child: Builder(
                    builder: (context) {
                      island = ThemeProvider.of(context);
                      return const SizedBox();
                    },
                  ),
                ),
                ThemeProvider(
                  child: Builder(
                    builder: (context) {
                      follower = ThemeProvider.of(context);
                      return const SizedBox();
                    },
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
    expect(outer.brightness, Brightness.light);

    KitDevTools.themeOverride.value = const ThemeOverride(
      brightness: Brightness.dark,
      palette: Palette.mono,
      density: Density.compact,
    );
    await tester.pump();
    expect(outer.brightness, Brightness.dark);
    expect(follower.brightness, Brightness.dark);
    expect(island.brightness, Brightness.light);
    for (final theme in [outer, island, follower]) {
      expect(theme.config.palette, Palette.mono);
      expect(theme.sizes.density, Density.compact);
    }

    KitDevTools.themeOverride.value = null;
    await tester.pump();
    expect(outer.config.palette, Palette.lab);
    expect(outer.brightness, Brightness.light);
  });

  testWidgets('getState lists the themes in the tree with their tokens', (
    tester,
  ) async {
    await tester.pumpWidget(
      const ThemeProvider(
        brightness: Brightness.dark,
        config: ThemeConfig(density: Density.thin),
        child: ThemeProvider(
          brightness: Brightness.light,
          child: SizedBox(),
        ),
      ),
    );
    final state = KitDevTools.state();
    final themes = state['themes']! as List;
    expect(themes, hasLength(2));
    final root = themes.first as Map<String, Object?>;
    expect(root['depth'], 0);
    expect(root['brightness'], 'dark');
    expect((themes.last as Map)['depth'], 1);
    final config = root['config']! as Map<String, Object?>;
    expect(config['density'], 'thin');
    expect(config['defaults'], contains('palette'));
    expect((root['colors']! as Map)['ink'], matches(RegExp(r'^#[0-9a-f]{6}')));
    expect((root['sizes']! as Map)['controlHeight'], 26.0);
    expect(state['capabilities'], isA<Map>());
    expect(state['override'], isNull);
  });

  test('theme objects describe their resolved values', () {
    final data = ThemeData(
      config: const ThemeConfig(palette: Palette.mono, radius: 0.5),
      brightness: Brightness.dark,
    );
    final text = data.toDiagnosticsNode().toStringDeep();
    expect(text, contains('brightness: dark'));
    final config = describeDiagnostics(data.config);
    expect(config['palette'], 'mono');
    expect(config['radius'], 0.5);
    expect(config['defaults'], isNot(contains('palette')));
    expect(colorHex(const Color(0x80ff0000)), '#ff000080');
  });

  test('timeline and log helpers run their body', () {
    expect(kitTimeline('test', () => 42), 42);
    kitLog('test', 'hello');
    expect(kReleaseMode, isFalse);
  });
}
