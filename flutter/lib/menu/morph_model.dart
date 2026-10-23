import 'dart:math' as math;
import 'dart:ui' show Rect;

import '../physics/spring.dart';
import 'placement.dart';

/// The menu morph: one glass bubble that grows out of the button that opened it and flies back
/// into it, fitted to iOS 26 menus measured on the simulator
/// (`research/liquid-glass/CONTROLS-MEASURED.md` §8). Pure geometry: the twin of
/// `@feeef.dev/ui/menu/morph-model` (vectors in `test/fixtures/menu.json`).
///
/// Rects are in the menu's own pixels: the menu's final rect is usually `Offset.zero & size` and
/// the trigger's rect is where the trigger sits relative to it.

/// What to paint at one moment of the morph.
class MenuMorphFrame {
  const MenuMorphFrame({
    required this.box,
    required this.radius,
    required this.contentOpacity,
    required this.contentBlur,
    required this.materialOpacity,
    required this.settled,
  });

  /// The bubble's outline.
  final Rect box;

  /// Its corner radius (a superellipse corner, like every kit corner).
  final double radius;

  /// Opacity of the menu's content inside the bubble.
  final double contentOpacity;

  /// Blur of the content in px (0 = sharp).
  final double contentBlur;

  /// Opacity of the glass itself; it fades only as it lands back in the trigger.
  final double materialOpacity;

  /// True once nothing moves any more.
  final bool settled;
}

/// The measured timings (seconds) and shapes (`MENU_MORPH`).
abstract final class MenuMorph {
  /// The trigger pinches (narrower, taller) before the bubble springs out.
  static const pinch = 0.024;
  static const pinchWidth = 0.86;
  static const pinchHeight = 1.12;

  /// The near-elliptical blob turns into the menu's rounded rect between these times.
  static const cornerFrom = 0.08;
  static const cornerTo = 0.26;

  /// Content starts this blurred (px) and this faint, then sharpens with the shape.
  static const contentBlur = 10.0;
  static const contentOpacity = 0.2;

  /// Content reaches full contrast (opacity) and full sharpness by these times.
  static const contrastBy = 0.3;
  static const sharpBy = 0.42;

  /// The trigger hides once the bubble covers it, and reappears as the bubble lands.
  static const hideTrigger = 0.06;
  static const revealTrigger = 0.16;

  /// Dismissal: content gone within this, height eases in over [closeHeight].
  static const closeContent = 0.05;
  static const closeHeight = 0.25;

  /// The empty glass fades between these times as it lands in the trigger; then the morph ends.
  static const closeFadeFrom = 0.2;
  static const closeEnd = 0.34;

  /// Reduced motion: a short crossfade in and out instead of the spring.
  static const fadeIn = 0.15;
  static const fadeOut = 0.1;
}

/// How long a dismissal takes in seconds.
double menuCloseDuration([bool reducedMotion = false]) =>
    reducedMotion ? MenuMorph.fadeOut : MenuMorph.closeEnd;

double _clamp01(double v) => v.clamp(0.0, 1.0);

/// Hermite smoothstep of [value] between [from] and [to].
double smoothstep(double from, double to, double value) {
  final t = _clamp01((value - from) / (to - from));
  return t * t * (3 - 2 * t);
}

double _easeOutCubic(double t) => 1 - math.pow(1 - _clamp01(t), 3).toDouble();

/// Moves every edge of [from] toward [to]: x edges by [px], y edges by [py] (both may overshoot).
Rect mixBox(Rect from, Rect to, double px, double py) {
  final left = mix(from.left, to.left, px);
  final right = mix(from.right, to.right, px);
  final top = mix(from.top, to.top, py);
  final bottom = mix(from.bottom, to.bottom, py);
  return Rect.fromLTWH(
    left,
    top,
    math.max(0, right - left),
    math.max(0, bottom - top),
  );
}

double _halfShort(Rect box) => math.min(box.width, box.height) / 2;

/// The trigger, pinched: narrower and taller around its centre.
Rect pinchedBox(Rect trigger) => Rect.fromCenter(
  center: trigger.center,
  width: trigger.width * MenuMorph.pinchWidth,
  height: trigger.height * MenuMorph.pinchHeight,
);

/// The settled, fully open frame.
MenuMorphFrame menuRestFrame(Rect box, double radius) => MenuMorphFrame(
  box: box,
  radius: math.min(radius, _halfShort(box)),
  contentOpacity: 1,
  contentBlur: 0,
  materialOpacity: 1,
  settled: true,
);

/// The opening morph [t] seconds after it started: the trigger ([from], corner [fromRadius])
/// pinches, then one bubble springs (`Springs.menu`) to the menu's rect ([to], corner [toRadius]),
/// a blob that becomes the rounded rect as it arrives, with the content sharpening inside it.
MenuMorphFrame menuOpenFrame(
  double t,
  Rect from,
  double fromRadius,
  Rect to,
  double toRadius,
) {
  final time = math.max(0.0, t);
  final pinched = pinchedBox(from);
  Rect box;
  var springDone = false;
  if (time < MenuMorph.pinch) {
    final k = _easeOutCubic(time / MenuMorph.pinch);
    box = mixBox(from, pinched, k, k);
  } else {
    final state = solveSpring(Springs.menu, 0, 1)(time - MenuMorph.pinch);
    box = mixBox(pinched, to, state.position, state.position);
    final travel = [
      1.0,
      (to.width - pinched.width).abs(),
      (to.height - pinched.height).abs(),
    ].reduce(math.max);
    springDone = springAtRest(state, 1, 0.25 / travel, 2.5 / travel);
  }
  final short = _halfShort(box);
  final blob = mix(
    math.min(fromRadius, short),
    short * 0.96,
    smoothstep(0, MenuMorph.pinch + 0.04, time),
  );
  final radius = math.min(
    short,
    mix(
      blob,
      toRadius,
      smoothstep(MenuMorph.cornerFrom, MenuMorph.cornerTo, time),
    ),
  );
  final contentOpacity =
      1 -
      (1 - MenuMorph.contentOpacity) *
          (1 - smoothstep(0, MenuMorph.contrastBy, time));
  final contentBlur =
      MenuMorph.contentBlur * (1 - smoothstep(0, MenuMorph.sharpBy, time));
  final settled = springDone && time >= MenuMorph.sharpBy;
  if (settled) return menuRestFrame(to, toRadius);
  return MenuMorphFrame(
    box: box,
    radius: radius,
    contentOpacity: contentOpacity,
    contentBlur: contentBlur,
    materialOpacity: 1,
    settled: false,
  );
}

/// The dismissal [t] seconds after it started from the frame on screen ([from], so a menu closed
/// while still opening turns around where it is): the content goes first, then the empty bubble
/// springs back into the trigger ([to]): x edges on `Springs.menuDismiss` (it narrows past the
/// trigger and springs back), y edges easing out, and the glass fades as it lands.
MenuMorphFrame menuCloseFrame(
  double t,
  MenuMorphFrame from,
  Rect to,
  double toRadius,
) {
  final time = math.max(0.0, t);
  final px = solveSpring(Springs.menuDismiss, 0, 1)(time).position;
  final py = _easeOutCubic(time / MenuMorph.closeHeight);
  final box = mixBox(from.box, to, px, py);
  final short = _halfShort(box);
  final blob = mix(from.radius, short * 0.96, smoothstep(0, 0.12, time));
  final radius = math.min(
    short,
    mix(
      blob,
      toRadius,
      smoothstep(MenuMorph.revealTrigger, MenuMorph.closeEnd, time),
    ),
  );
  final gone = smoothstep(0, MenuMorph.closeContent, time);
  final settled = time >= MenuMorph.closeEnd;
  return MenuMorphFrame(
    box: box,
    radius: radius,
    contentOpacity: from.contentOpacity * (1 - gone),
    contentBlur: mix(from.contentBlur, MenuMorph.contentBlur, gone),
    materialOpacity: settled
        ? 0
        : from.materialOpacity *
              (1 -
                  smoothstep(
                    MenuMorph.closeFadeFrom,
                    MenuMorph.closeEnd,
                    time,
                  )),
    settled: settled,
  );
}

/// Reduced motion: the menu appears or leaves in place with a short crossfade.
MenuMorphFrame menuFadeFrame(double t, bool opening, Rect box, double radius) {
  final duration = opening ? MenuMorph.fadeIn : MenuMorph.fadeOut;
  final k = smoothstep(0, duration, math.max(0, t));
  final opacity = opening ? k : 1 - k;
  return MenuMorphFrame(
    box: box,
    radius: math.min(radius, _halfShort(box)),
    contentOpacity: opacity,
    contentBlur: 0,
    materialOpacity: opacity,
    settled: t >= duration,
  );
}

/// Where a menu lines up with its trigger (Radix `align`): a toolbar trigger lines up with the
/// edge on the side of its bounds it sits on, so the menu grows into the page; an in-content
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
