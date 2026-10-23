import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

Widget _app({
  required ThemeConfig config,
  bool disableAnimations = false,
  required Widget child,
}) => MediaQuery(
  data: MediaQueryData(disableAnimations: disableAnimations),
  child: ThemeProvider(
    config: config,
    child: Directionality(textDirection: TextDirection.ltr, child: child),
  ),
);

/// A page full of ambient loops: breathing texture, the pixel shader and a loader.
const _ambient = Column(
  children: [
    SizedBox(width: 200, height: 80, child: PixelTexture(animated: true)),
    SizedBox(width: 200, height: 80, child: PixelShader()),
    PixelLoader(),
  ],
);

void main() {
  testWidgets('motionOf is the config made stricter by the platform', (
    tester,
  ) async {
    Future<Motion> read(Motion config, bool platform) async {
      late Motion motion;
      late bool reduced;
      await tester.pumpWidget(
        _app(
          config: ThemeConfig(motion: config),
          disableAnimations: platform,
          child: Builder(
            builder: (context) {
              motion = motionOf(context);
              reduced = reducedMotionOf(context);
              return const SizedBox();
            },
          ),
        ),
      );
      expect(reduced, motion != Motion.full);
      return motion;
    }

    expect(await read(Motion.full, false), Motion.full);
    expect(await read(Motion.full, true), Motion.reduced);
    expect(await read(Motion.reduced, false), Motion.reduced);
    expect(await read(Motion.reduced, true), Motion.reduced);
    expect(await read(Motion.none, false), Motion.none);
    expect(await read(Motion.none, true), Motion.none);
  });

  testWidgets('without a ThemeProvider only the platform setting counts', (
    tester,
  ) async {
    late Motion motion;
    await tester.pumpWidget(
      MediaQuery(
        data: const MediaQueryData(disableAnimations: true),
        child: Builder(
          builder: (context) {
            motion = motionOf(context);
            return const SizedBox();
          },
        ),
      ),
    );
    expect(motion, Motion.reduced);
  });

  test('profiles are plain configs changed with copyWith', () {
    expect(ThemeProfiles.quality.glass, GlassStyle.liquid);
    expect(ThemeProfiles.quality.glassRefraction, isTrue);
    expect(ThemeProfiles.quality.glassBlur, isTrue);
    expect(ThemeProfiles.quality.motion, Motion.full);
    expect(ThemeProfiles.balanced.glass, GlassStyle.still);
    expect(ThemeProfiles.balanced.glassRefraction, isFalse);
    expect(ThemeProfiles.balanced.glassBlur, isFalse);
    expect(ThemeProfiles.balanced.motion, Motion.full);
    expect(ThemeProfiles.performance.glass, GlassStyle.solid);
    expect(ThemeProfiles.performance.glassRefraction, isFalse);
    expect(ThemeProfiles.performance.glassBlur, isFalse);
    expect(ThemeProfiles.performance.motion, Motion.none);
    final mono = ThemeProfiles.balanced.copyWith(palette: Palette.mono);
    expect(mono.palette, Palette.mono);
    expect(mono.glass, GlassStyle.still);
    expect(ThemeConfig.defaults.motion, Motion.full);
  });

  test('glassCapabilities reports blur everywhere', () {
    expect(glassCapabilities().backdropBlur, isTrue);
  });

  testWidgets('ambient loops tick under full motion', (tester) async {
    await tester.pumpWidget(
      _app(config: ThemeConfig.defaults, child: _ambient),
    );
    await tester.pump(const Duration(milliseconds: 100));
    expect(SchedulerBinding.instance.hasScheduledFrame, isTrue);
  });

  testWidgets('motion none stops every ambient loop', (tester) async {
    await tester.pumpWidget(
      _app(config: ThemeProfiles.performance, child: _ambient),
    );
    await tester.pumpAndSettle();
    await tester.pump(const Duration(milliseconds: 100));
    expect(SchedulerBinding.instance.hasScheduledFrame, isFalse);
  });
}
