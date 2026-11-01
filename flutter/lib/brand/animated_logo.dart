/// Animated feeef wordmark — the twin of `brand/animated-logo.ts` (from marchant
/// `web/index.html` `#animated_full_logo`). [foAnimatedLogoSvg] is the same SVG markup, character
/// for character; [foAnimatedLogoTimeline] is its SMIL animations as data, and
/// [FoAnimatedLogoPlayer] plays them natively.
library;

import 'package:flutter/foundation.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/widgets.dart';

import '../theme.dart';
import 'logo.dart';

/// The animated wordmark as SVG markup with SMIL animations (`FO_ANIMATED_LOGO_SVG`).
const foAnimatedLogoSvg = r'''<svg id="animated_full_logo" width="1080" height="1080" viewBox="0 0 1080 1080" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 150px;height: 150px;">
        <style>
          [stroke="#000000"] {
            stroke: currentColor;
          }
          [stroke="#49D249"] {
            stroke: var(--lab-brand-1, #49D249);
          }
          [stroke="#60EA60"] {
            stroke: var(--lab-brand-2, #60EA60);
          }
        </style>
        
        <!-- Group 1: Main container - Position moves X: 974.28 → 540 (t=40-72)-->
        <g transform="translate(974.279,639.649)">
          <animateTransform attributeName="transform" type="translate" from="974.279,639.649" to="540,639.649" begin="1.133s" dur="1s" keySplines=".5 0 .14 .85" keyTimes="0;1" fill="freeze" calcMode="spline"></animateTransform>
          
          <!-- ========== F1 1: First F (Left) ========== -->
          <!-- Position: Y moves from 0.33 → -99.65 (t=19-53) -->
          <g transform="translate(-434.279,0.326)">
            <animateTransform attributeName="transform" type="translate" from="-434.279,100.326" to="-434.279,-99.649" begin="0s" dur="1.033s" keySplines="0.42 0 0.58 1" keyTimes="0;1" fill="freeze" calcMode="spline"></animateTransform>
            
            <!-- F1 1 - polyline 2: Main vertical + bottom curve -->
            <!-- Color: #49D249 | Stroke: t=19-22 | Dash: t=19-44 -->
            <path d="M53.705,-99.975 L53.705,-99.975 L20.405,-99.975 C3.384,-99.975 -12.296,-94.237 -24.808,-84.590 C-42.383,-71.039 -53.705,-49.774 -53.705,-25.865 L-53.705,-6.555 L-53.705,-6.555 L-53.705,99.975 L-53.705,99.975" fill="none" stroke="#49D249" stroke-width="0.01" stroke-linecap="round" stroke-linejoin="round" pathLength="279.059" stroke-dasharray="279.059" stroke-dashoffset="279.059">
              <animate attributeName="stroke-width" from="0.01" to="43" begin="0.333s" dur="0.100s" keySplines="0.42 0 0.58 1" keyTimes="0;1" fill="freeze" calcMode="spline"></animate>
              <animate attributeName="stroke-dashoffset" from="279.059" to="0" begin="0.333s" dur="0.833s" keySplines="0.42 0 0.58 1" keyTimes="0;1" fill="freeze" calcMode="spline"></animate>
            </path>
            
            <!-- F1 1 - polyline 3: Top curve of F -->
            <!-- Color: #60EA60 | Stroke: t=34-39 | Dash: t=37-53 -->
            <path d="M-53.705,99.975 L-53.705,99.975 L-53.705,99.975 C-53.705,89.241 -51.423,79.041 -47.318,69.832 C-42.538,59.108 -35.285,49.729 -26.285,42.419 C-13.541,32.068 2.708,25.865 20.405,25.865 L53.705,25.865 L53.705,25.865" fill="none" stroke="#60EA60" stroke-width="0.01" stroke-linecap="round" stroke-linejoin="round" pathLength="429.137" stroke-dasharray="429.137" stroke-dashoffset="429.137">
              <animate attributeName="stroke-width" from="0.01" to="43" begin="0.833s" dur="0.667s" keySplines="0.42 0 0.58 1" keyTimes="0;1" fill="freeze" calcMode="spline"></animate>
              <animate attributeName="stroke-dashoffset" from="429.137" to="0" begin="1.27233s" dur="0.533s" keySplines="0.42 0 0.58 1" keyTimes="0;1" fill="freeze" calcMode="spline"></animate>
            </path>
          </g>
          
          <!-- ========== E1: First E ========== -->
          <!-- Position: Y moves from 100.30 → 0.33 (t=40-64) -->
          <g transform="translate(-469.934,100.301)">
            <animateTransform attributeName="transform" type="translate" from="-469.934,100.301" to="-469.934,0.326" begin="1.333s" dur="0.800s" keySplines="0.42 0 0.58 1" keyTimes="0;1" fill="freeze" calcMode="spline"></animateTransform>
            
            <!-- E1 - Curve 1 (with anchor offset) -->
            <!-- Position: (235.20, -99.98) | Anchor: (-104.44, 138.85) -->
            <!-- Color: #000000 | Stroke: t=40-51 | Dash: t=40-64 -->
            <g transform="translate(235.20, -99.98)">
              <g transform="translate(104.44, -138.85)">
                <path d="M-123.855,164.712 L-123.855,164.712 L-80.519,164.712 C-45.770,164.712 -17.599,136.541 -17.599,101.792 L-17.599,101.792 C-17.599,67.042 -45.770,38.872 -80.519,38.872 L-93.403,38.872 L-93.403,38.872 L-117.164,38.872 C-158.094,38.872 -191.274,72.052 -191.274,112.982 L-191.274,164.712 L-191.274,164.712 L-191.274,164.712 C-191.274,205.642 -158.094,238.822 -117.164,238.822 L-83.864,238.822 L-83.864,238.822" fill="none" stroke="#000000" stroke-width="0.01" stroke-linecap="round" stroke-linejoin="round" pathLength="595" stroke-dasharray="595" stroke-dashoffset="595">
                  <animate attributeName="stroke-width" from="0.01" to="43" begin="1.333s" dur="0.367s" keySplines="0.42 0 0.58 1" keyTimes="0;1" fill="freeze" calcMode="spline"></animate>
                  <animate attributeName="stroke-dashoffset" from="595" to="0" begin="1.333s" dur="0.800s" keySplines="0.42 0 0.58 1" keyTimes="0;1" fill="freeze" calcMode="spline"></animate>
                </path>
              </g>
            </g>
          </g>
          
          <!-- ========== E2: Second E ========== -->
          <!-- Position: Y moves from 100.30 → 0.33 (t=44-68) -->
          <g transform="translate(-237.318,100.301)">
            <animateTransform attributeName="transform" type="translate" from="-237.318,100.301" to="-237.318,0.326" begin="1.467s" dur="0.800s" keySplines="0.42 0 0.58 1" keyTimes="0;1" fill="freeze" calcMode="spline"></animateTransform>
            
            <!-- E2 - Curve 1 -->
            <g transform="translate(235.20, -99.98)">
              <g transform="translate(104.44, -138.85)">
                <path d="M-123.855,164.712 L-123.855,164.712 L-80.519,164.712 C-45.770,164.712 -17.599,136.541 -17.599,101.792 L-17.599,101.792 C-17.599,67.042 -45.770,38.872 -80.519,38.872 L-93.403,38.872 L-93.403,38.872 L-117.164,38.872 C-158.094,38.872 -191.274,72.052 -191.274,112.982 L-191.274,164.712 L-191.274,164.712 L-191.274,164.712 C-191.274,205.642 -158.094,238.822 -117.164,238.822 L-83.864,238.822 L-83.864,238.822" fill="none" stroke="#000000" stroke-width="0.01" stroke-linecap="round" stroke-linejoin="round" pathLength="595" stroke-dasharray="595" stroke-dashoffset="595">
                  <animate attributeName="stroke-width" from="0.01" to="43" begin="1.467s" dur="0.367s" keySplines="0.42 0 0.58 1" keyTimes="0;1" fill="freeze" calcMode="spline"></animate>
                  <animate attributeName="stroke-dashoffset" from="595" to="0" begin="1.467s" dur="0.800s" keySplines="0.42 0 0.58 1" keyTimes="0;1" fill="freeze" calcMode="spline"></animate>
                </path>
              </g>
            </g>
          </g>
          
          <!-- ========== E3: Third E ========== -->
          <!-- Position: Y moves from 100.30 → 0.33 (t=48-72) -->
          <g transform="translate(-4.988,100.301)">
            <animateTransform attributeName="transform" type="translate" from="-4.988,100.301" to="-4.988,0.326" begin="1.600s" dur="0.800s" keySplines="0.42 0 0.58 1" keyTimes="0;1" fill="freeze" calcMode="spline"></animateTransform>
            
            <!-- E3 - Curve 1 -->
            <g transform="translate(235.20, -99.98)">
              <g transform="translate(104.44, -138.85)">
                <path d="M-123.855,164.712 L-123.855,164.712 L-80.519,164.712 C-45.770,164.712 -17.599,136.541 -17.599,101.792 L-17.599,101.792 C-17.599,67.042 -45.770,38.872 -80.519,38.872 L-93.403,38.872 L-93.403,38.872 L-117.164,38.872 C-158.094,38.872 -191.274,72.052 -191.274,112.982 L-191.274,164.712 L-191.274,164.712 L-191.274,164.712 C-191.274,205.642 -158.094,238.822 -117.164,238.822 L-83.864,238.822 L-83.864,238.822" fill="none" stroke="#000000" stroke-width="0.01" stroke-linecap="round" stroke-linejoin="round" pathLength="595" stroke-dasharray="595" stroke-dashoffset="595">
                  <animate attributeName="stroke-width" from="0.01" to="43" begin="1.600s" dur="0.367s" keySplines="0.42 0 0.58 1" keyTimes="0;1" fill="freeze" calcMode="spline"></animate>
                  <animate attributeName="stroke-dashoffset" from="595" to="0" begin="1.600s" dur="0.800s" keySplines="0.42 0 0.58 1" keyTimes="0;1" fill="freeze" calcMode="spline"></animate>
                </path>
              </g>
            </g>
          </g>
          
          <!-- ========== F1: Last F (Right) ========== -->
          <!-- Position: Y moves from 0.33 → -99.65 (t=57-91) -->
          <g transform="translate(434.279,0.326)">
            <animateTransform attributeName="transform" type="translate" from="434.279,0.326" to="434.279,-99.649" begin="1.900s" dur="1.133s" keySplines="0.42 0 0.58 1" keyTimes="0;1" fill="freeze" calcMode="spline"></animateTransform>
            
            <!-- F1 - polyline 2: Main vertical + bottom curve -->
            <!-- Color: #000000 | Stroke: t=57-60 | Dash: t=57-82 -->
            <path d="M53.705,-99.975 L53.705,-99.975 L20.405,-99.975 C3.384,-99.975 -12.296,-94.237 -24.808,-84.590 C-42.383,-71.039 -53.705,-49.774 -53.705,-25.865 L-53.705,-6.555 L-53.705,-6.555 L-53.705,99.975 L-53.705,99.975" fill="none" stroke="#000000" stroke-width="0.01" stroke-linecap="round" stroke-linejoin="round" pathLength="279.059" stroke-dasharray="279.059" stroke-dashoffset="279.059">
              <animate attributeName="stroke-width" from="0.01" to="43" begin="1.900s" dur="0.100s" keySplines="0.42 0 0.58 1" keyTimes="0;1" fill="freeze" calcMode="spline"></animate>
              <animate attributeName="stroke-dashoffset" from="279.059" to="0" begin="1.900s" dur="0.533s" keySplines="0.42 0 0.58 1" keyTimes="0;1" fill="freeze" calcMode="spline"></animate>
            </path>
            
            <!-- F1 - polyline 3: Top curve of F -->
            <!-- Color: #000000 | Stroke: t=72-77 | Dash: t=75-91 -->
            <path d="M-53.705,99.975 L-53.705,99.975 L-53.705,99.975 C-53.705,89.241 -51.423,79.041 -47.318,69.832 C-42.538,59.108 -35.285,49.729 -26.285,42.419 C-13.541,32.068 2.708,25.865 20.405,25.865 L53.705,25.865 L53.705,25.865" fill="none" stroke="#000000" stroke-width="0.01" stroke-linecap="round" stroke-linejoin="round" pathLength="429.137" stroke-dasharray="429.137" stroke-dashoffset="429.137">
              <animate attributeName="stroke-width" from="0.01" to="43" begin="2.400s" dur="0.367s" keySplines="0.42 0 0.58 1" keyTimes="0;1" fill="freeze" calcMode="spline"></animate>
              <animate attributeName="stroke-dashoffset" from="429.137" to="0" begin="2.400s" dur="0.533s" keySplines="0.42 0 0.58 1" keyTimes="0;1" fill="freeze" calcMode="spline"></animate>
            </path>
          </g>
          
        </g>
      </svg>''';

/// A cubic-bezier easing (`keySplines`), solved to double precision.
@immutable
class KeySpline {
  const KeySpline(this.x1, this.y1, this.x2, this.y2);
  final double x1, y1, x2, y2;

  static double _bezier(double a, double b, double s) {
    final r = 1 - s;
    return 3 * r * r * s * a + 3 * r * s * s * b + s * s * s;
  }

  /// Eased progress for linear progress [p] (0–1): solves x(s) = p by bisection, returns y(s).
  double transform(double p) {
    if (p <= 0) return 0;
    if (p >= 1) return 1;
    var lo = 0.0, hi = 1.0;
    for (var i = 0; i < 64; i++) {
      final mid = (lo + hi) / 2;
      if (_bezier(x1, x2, mid) < p) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
    return _bezier(y1, y2, (lo + hi) / 2);
  }
}

/// What a [LogoAnimation] animates.
enum LogoAttribute { transform, strokeWidth, strokeDashoffset }

/// One SMIL `<animate>` / `<animateTransform type="translate">` with `fill="freeze"`,
/// `calcMode="spline"` and `keyTimes="0;1"`: [base] before [begin], [from] → [to] eased over
/// [dur] seconds, then frozen at [to].
@immutable
class LogoAnimation {
  const LogoAnimation(
    this.attribute,
    this.from,
    this.to, {
    required this.begin,
    required this.dur,
    required this.spline,
    List<double>? base,
  }) : base = base ?? from;

  final LogoAttribute attribute;

  /// Values: `[x, y]` for a translate, `[value]` otherwise.
  final List<double> from, to, base;

  /// Seconds.
  final double begin, dur;
  final KeySpline spline;

  /// The animated value at [time] seconds.
  List<double> valueAt(double time) {
    if (time < begin) return base;
    final p = dur <= 0 ? 1.0 : ((time - begin) / dur).clamp(0.0, 1.0);
    final e = spline.transform(p);
    return [
      for (var i = 0; i < from.length; i++) from[i] + (to[i] - from[i]) * e,
    ];
  }

  /// Seconds at which it freezes.
  double get end => begin + dur;
}

/// Which ink a stroke of the animated mark takes: `#49D249` → brand 1, `#60EA60` → brand 2,
/// `#000000` → the current text colour.
typedef AnimatedLogoStroke = ({
  String d,
  LogoInk ink,
  double pathLength,
  LogoAnimation width,
  LogoAnimation dash,
});

/// One letter group: its moving translate, a fixed inner offset (the Es' nested groups) and strokes.
typedef AnimatedLogoLetter = ({
  LogoAnimation move,
  Offset inner,
  List<AnimatedLogoStroke> strokes,
});

const _ease = KeySpline(0.42, 0, 0.58, 1);
const _fVertical =
    'M53.705,-99.975 L53.705,-99.975 L20.405,-99.975 C3.384,-99.975 -12.296,-94.237 -24.808,-84.590 C-42.383,-71.039 -53.705,-49.774 -53.705,-25.865 L-53.705,-6.555 L-53.705,-6.555 L-53.705,99.975 L-53.705,99.975';
const _fTop =
    'M-53.705,99.975 L-53.705,99.975 L-53.705,99.975 C-53.705,89.241 -51.423,79.041 -47.318,69.832 C-42.538,59.108 -35.285,49.729 -26.285,42.419 C-13.541,32.068 2.708,25.865 20.405,25.865 L53.705,25.865 L53.705,25.865';
const _e =
    'M-123.855,164.712 L-123.855,164.712 L-80.519,164.712 C-45.770,164.712 -17.599,136.541 -17.599,101.792 L-17.599,101.792 C-17.599,67.042 -45.770,38.872 -80.519,38.872 L-93.403,38.872 L-93.403,38.872 L-117.164,38.872 C-158.094,38.872 -191.274,72.052 -191.274,112.982 L-191.274,164.712 L-191.274,164.712 L-191.274,164.712 C-191.274,205.642 -158.094,238.822 -117.164,238.822 L-83.864,238.822 L-83.864,238.822';

LogoAnimation _width(double begin, double dur) => LogoAnimation(
  LogoAttribute.strokeWidth,
  const [0.01],
  const [43],
  begin: begin,
  dur: dur,
  spline: _ease,
);
LogoAnimation _dash(double length, double begin, double dur) => LogoAnimation(
  LogoAttribute.strokeDashoffset,
  [length],
  const [0],
  begin: begin,
  dur: dur,
  spline: _ease,
);

AnimatedLogoLetter _letterE(double x, double begin) => (
  move: LogoAnimation(
    LogoAttribute.transform,
    [x, 100.301],
    [x, 0.326],
    begin: begin,
    dur: 0.8,
    spline: _ease,
  ),
  inner: const Offset(235.20 + 104.44, -99.98 - 138.85),
  strokes: [
    (
      d: _e,
      ink: LogoInk.current,
      pathLength: 595,
      width: _width(begin, 0.367),
      dash: _dash(595, begin, 0.8),
    ),
  ],
);

/// The outer group's slide (x 974.28 → 540).
final foAnimatedLogoMove = LogoAnimation(
  LogoAttribute.transform,
  const [974.279, 639.649],
  const [540, 639.649],
  begin: 1.133,
  dur: 1,
  spline: const KeySpline(0.5, 0, 0.14, 0.85),
);

/// The letters, left to right: F (green), E, E, E, F.
final List<AnimatedLogoLetter> foAnimatedLogoLetters = [
  (
    move: LogoAnimation(
      LogoAttribute.transform,
      const [-434.279, 100.326],
      const [-434.279, -99.649],
      begin: 0,
      dur: 1.033,
      spline: _ease,
      base: const [-434.279, 0.326],
    ),
    inner: Offset.zero,
    strokes: [
      (
        d: _fVertical,
        ink: LogoInk.brand1,
        pathLength: 279.059,
        width: _width(0.333, 0.100),
        dash: _dash(279.059, 0.333, 0.833),
      ),
      (
        d: _fTop,
        ink: LogoInk.brand2,
        pathLength: 429.137,
        width: _width(0.833, 0.667),
        dash: _dash(429.137, 1.27233, 0.533),
      ),
    ],
  ),
  _letterE(-469.934, 1.333),
  _letterE(-237.318, 1.467),
  _letterE(-4.988, 1.600),
  (
    move: LogoAnimation(
      LogoAttribute.transform,
      const [434.279, 0.326],
      const [434.279, -99.649],
      begin: 1.900,
      dur: 1.133,
      spline: _ease,
    ),
    inner: Offset.zero,
    strokes: [
      (
        d: _fVertical,
        ink: LogoInk.current,
        pathLength: 279.059,
        width: _width(1.900, 0.100),
        dash: _dash(279.059, 1.900, 0.533),
      ),
      (
        d: _fTop,
        ink: LogoInk.current,
        pathLength: 429.137,
        width: _width(2.400, 0.367),
        dash: _dash(429.137, 2.400, 0.533),
      ),
    ],
  ),
];

/// Every animation in document order (the order of the SVG's `<animate*>` elements).
List<LogoAnimation> get foAnimatedLogoTimeline => [
  foAnimatedLogoMove,
  for (final letter in foAnimatedLogoLetters) ...[
    letter.move,
    for (final stroke in letter.strokes) ...[stroke.width, stroke.dash],
  ],
];

/// When the last animation freezes (3.033 s).
double get foAnimatedLogoDuration =>
    foAnimatedLogoTimeline.map((a) => a.end).reduce((a, b) => a > b ? a : b);

/// View box of the animated mark (`0 0 1080 1080`).
const animatedLogoViewBox = Size(1080, 1080);

/// Plays the animated wordmark: the native twin of rendering [foAnimatedLogoSvg]. Strokes draw on,
/// the letters rise into place and the mark slides to the centre in about 3 s, then it stays.
/// Reduced motion shows the finished mark. Decorative; label what surrounds it.
class FoAnimatedLogoPlayer extends StatefulWidget {
  const FoAnimatedLogoPlayer({
    super.key,
    this.size = 150,
    this.time,
    this.onEnd,
  });

  /// Width and height (the SVG's `style="width: 150px;height: 150px"`).
  final double size;

  /// A fixed moment in seconds instead of playing (like `svg.setCurrentTime(time)`).
  final double? time;

  /// Called once when the animation finishes.
  final VoidCallback? onEnd;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(DoubleProperty('size', size, defaultValue: 150))
      ..add(DoubleProperty('time', time, ifNull: 'playing', defaultValue: null))
      ..add(ObjectFlagProperty<VoidCallback?>.has('onEnd', onEnd));
  }

  @override
  State<FoAnimatedLogoPlayer> createState() => _FoAnimatedLogoPlayerState();
}

class _FoAnimatedLogoPlayerState extends State<FoAnimatedLogoPlayer>
    with SingleTickerProviderStateMixin {
  late final Ticker _ticker = createTicker(_tick);
  double _time = 0;
  bool _ended = false;

  void _tick(Duration elapsed) {
    final t = elapsed.inMicroseconds / 1e6;
    setState(() => _time = t);
    if (t >= foAnimatedLogoDuration) _finish();
  }

  void _finish() {
    _ticker.stop();
    if (_ended) return;
    _ended = true;
    widget.onEnd?.call();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final reduced = reducedMotionOf(context);
    if (widget.time != null || _ended || _ticker.isActive) return;
    if (reduced) {
      _time = foAnimatedLogoDuration;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _finish();
      });
    } else {
      _ticker.start();
    }
  }

  @override
  void dispose() {
    _ticker.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final current =
        DefaultTextStyle.of(context).style.color ?? theme.colors.ink;
    return ExcludeSemantics(
      child: SizedBox.square(
        dimension: widget.size,
        child: CustomPaint(
          painter: _AnimatedLogoPainter(
            time: widget.time ?? _time,
            brand1: brandColor1(theme),
            brand2: brandColor2(theme),
            current: current,
          ),
        ),
      ),
    );
  }
}

final _paths = <String, Path>{};
Path _cached(String d) => _paths.putIfAbsent(d, () => svgPath(d));

/// The visible part of a stroke with `pathLength` [pathLength], `stroke-dasharray: pathLength` and
/// `stroke-dashoffset` [offset].
Path _visible(Path path, double pathLength, double offset) {
  final out = Path();
  final fraction = ((pathLength - offset) / pathLength).clamp(0.0, 1.0);
  if (fraction <= 0) return out;
  for (final metric in path.computeMetrics()) {
    out.addPath(metric.extractPath(0, metric.length * fraction), Offset.zero);
  }
  return out;
}

class _AnimatedLogoPainter extends CustomPainter {
  _AnimatedLogoPainter({
    required this.time,
    required this.brand1,
    required this.brand2,
    required this.current,
  });
  final double time;
  final Color brand1, brand2, current;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.save();
    canvas.transform(viewBoxTransform(animatedLogoViewBox, size).storage);
    final group = foAnimatedLogoMove.valueAt(time);
    canvas.translate(group[0], group[1]);
    for (final letter in foAnimatedLogoLetters) {
      final move = letter.move.valueAt(time);
      canvas.save();
      canvas.translate(move[0] + letter.inner.dx, move[1] + letter.inner.dy);
      for (final stroke in letter.strokes) {
        final color = switch (stroke.ink) {
          LogoInk.brand1 => brand1,
          LogoInk.brand2 => brand2,
          LogoInk.current => current,
        };
        paintLogoStroke(
          canvas,
          _visible(
            _cached(stroke.d),
            stroke.pathLength,
            stroke.dash.valueAt(time)[0],
          ),
          color,
          stroke.width.valueAt(time)[0],
        );
      }
      canvas.restore();
    }
    canvas.restore();
  }

  @override
  bool shouldRepaint(_AnimatedLogoPainter old) =>
      old.time != time ||
      old.brand1 != brand1 ||
      old.brand2 != brand2 ||
      old.current != current;
}
