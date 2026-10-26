import '../physics/spring.dart' show mix;
import '../theme_config.dart' show Motion, motionFade;
import 'placement.dart';

/// The menu's motion around its glass: the glass itself is a `GlassContainer` shape born out of the
/// menu's button and returning into it (`glassOriginSprings`, `glass/transitions.dart`); this is
/// what the rows and the button do meanwhile, fitted to iOS 26 menus measured on the simulator
/// (`research/liquid-glass/CONTROLS-MEASURED.md` §8). Pure: the twin of
/// `@feeef.dev/ui/menu/morph-model` (vectors in `test/fixtures/menu.json`).

/// The menu's rows at one moment: they sit in the glass from its first frame, blurred and faint.
class MenuContentFrame {
  const MenuContentFrame({
    required this.opacity,
    required this.blur,
    required this.settled,
  });

  /// Opacity of the rows.
  final double opacity;

  /// Blur of the rows in px (0 = sharp).
  final double blur;

  /// True once they no longer change.
  final bool settled;
}

/// The measured timings, in seconds (`MENU_MORPH`).
abstract final class MenuMorph {
  /// Rows start this blurred (px) and this faint, then sharpen as the glass arrives.
  static const contentBlur = 10.0;
  static const contentOpacity = 0.2;

  /// Rows reach full contrast (opacity) and full sharpness by these times.
  static const contrastBy = 0.3;
  static const sharpBy = 0.42;

  /// The button hides once the glass covers it, and reappears as the glass lands back in it.
  static const hideTrigger = 0.06;
  static const revealTrigger = 0.16;

  /// Dismissal: the rows are gone within this.
  static const closeContent = 0.05;

  /// Dismissal: the glass has landed back in the button (`Springs.menuDismiss` settled within half
  /// a pixel over 250 px) and the menu can unmount.
  static const closeEnd = 0.48;

  /// Reduced motion: a short crossfade of the rows in and out instead.
  static const fadeIn = 0.15;
  static const fadeOut = 0.1;
}

/// How long a dismissal takes in seconds, for the host that keeps the menu mounted until it ends.
double menuCloseDuration([Motion motion = Motion.full]) => motion == Motion.full
    ? MenuMorph.closeEnd
    : _fadeSeconds(motion, MenuMorph.fadeOut);

/// [motionFade] in seconds, the unit the motion runs in.
double _fadeSeconds(Motion motion, double seconds) =>
    motionFade(
      motion,
      Duration(microseconds: (seconds * 1e6).round()),
    ).inMicroseconds /
    1e6;

double _clamp01(double v) => v.clamp(0.0, 1.0);

/// Hermite smoothstep of [value] between [from] and [to].
double smoothstep(double from, double to, double value) {
  final t = _clamp01((value - from) / (to - from));
  return t * t * (3 - 2 * t);
}

/// The rows [t] seconds after the menu started opening (its glass leaving the button).
MenuContentFrame menuContentOpenFrame(double t, {Motion motion = Motion.full}) {
  final time = t < 0 ? 0.0 : t;
  if (motion != Motion.full) {
    final duration = _fadeSeconds(motion, MenuMorph.fadeIn);
    return MenuContentFrame(
      opacity: duration == 0 ? 1 : smoothstep(0, duration, time),
      blur: 0,
      settled: time >= duration,
    );
  }
  return MenuContentFrame(
    opacity:
        1 -
        (1 - MenuMorph.contentOpacity) *
            (1 - smoothstep(0, MenuMorph.contrastBy, time)),
    blur: MenuMorph.contentBlur * (1 - smoothstep(0, MenuMorph.sharpBy, time)),
    settled: time >= MenuMorph.sharpBy,
  );
}

/// The rows [t] seconds after the menu started closing from [from] (the frame on screen, so a
/// menu closed while still opening turns around where it is): they go first, before the glass
/// flies back.
MenuContentFrame menuContentCloseFrame(
  double t,
  MenuContentFrame from, {
  Motion motion = Motion.full,
}) {
  final time = t < 0 ? 0.0 : t;
  if (motion != Motion.full) {
    final duration = _fadeSeconds(motion, MenuMorph.fadeOut);
    final gone = duration == 0 ? 1.0 : smoothstep(0, duration, time);
    return MenuContentFrame(
      opacity: from.opacity * (1 - gone),
      blur: from.blur,
      settled: time >= duration,
    );
  }
  final gone = smoothstep(0, MenuMorph.closeContent, time);
  return MenuContentFrame(
    opacity: from.opacity * (1 - gone),
    blur: mix(from.blur, MenuMorph.contentBlur, gone),
    settled: time >= MenuMorph.closeContent,
  );
}

/// Which edge of its trigger a menu lines up with (`menuAlign`): a toolbar trigger lines up with
/// the edge on the side of its bounds it sits on, so the menu grows into the page; an in-content
/// trigger is centred on. Positions are physical x.
PanelAlign menuAlign(
  bool toolbar,
  double triggerCenter,
  double boundsLeft,
  double boundsRight, {
  bool rtl = false,
}) {
  if (!toolbar) return PanelAlign.center;
  final left = triggerCenter <= (boundsLeft + boundsRight) / 2;
  return left != rtl ? PanelAlign.start : PanelAlign.end;
}
