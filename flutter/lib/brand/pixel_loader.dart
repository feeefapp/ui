import 'package:flutter/widgets.dart';

import '../i18n/i18n.dart';
import '../theme.dart';

/// A nine-pixel loading wave: the twin of `PixelLoader` in `@feeef.dev/ui/pixel-art`. Squares in
/// the current text colour light up in a diagonal wave (1.2s, each square delayed by its column
/// and row). Use [decorative] when nearby text already announces the work.
class PixelLoader extends StatefulWidget {
  const PixelLoader({
    super.key,
    this.size = 20,
    this.label,
    this.decorative = false,
    this.progress,
    this.color,
  });

  /// Width and height in pixels.
  final double size;

  /// Accessible status text; the localized "Loading…" when null.
  final String? label;

  /// Hides the loader from assistive technology.
  final bool decorative;

  /// Shows progress instead of the wave: 0 … 1 lights the squares one by one in wave order (a
  /// pull-to-refresh pulling toward its threshold).
  final double? progress;

  /// Square colour; defaults to the icon colour, then the text colour.
  final Color? color;

  @override
  State<PixelLoader> createState() => _PixelLoaderState();
}

class _PixelLoaderState extends State<PixelLoader>
    with SingleTickerProviderStateMixin {
  late final _clock = AnimationController(
    vsync: this,
    duration: const Duration(days: 1),
  );

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _sync();
  }

  @override
  void didUpdateWidget(PixelLoader old) {
    super.didUpdateWidget(old);
    if ((old.progress == null) != (widget.progress == null)) _sync();
  }

  /// The wave runs only while it shows: not under reduced motion, not while showing progress (it
  /// starts from its first frame when progress ends).
  void _sync() {
    if (reducedMotionOf(context) || widget.progress != null) {
      _clock.stop();
    } else if (!_clock.isAnimating) {
      _clock.forward(from: 0);
    }
  }

  @override
  void dispose() {
    _clock.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final color =
        widget.color ??
        IconTheme.of(context).color ??
        DefaultTextStyle.of(context).style.color!;
    final still = reducedMotionOf(context);
    // The wave repaints every frame straight from the clock, in its own layer: nothing rebuilds
    // or lays out, and the page around it never repaints.
    final loader = RepaintBoundary(
      child: SizedBox.square(
        dimension: widget.size,
        child: CustomPaint(
          painter: _LoaderPainter(
            color: color,
            progress: widget.progress,
            clock: still ? null : _clock,
          ),
        ),
      ),
    );
    if (widget.decorative) return ExcludeSemantics(child: loader);
    return Semantics(
      liveRegion: true,
      label: widget.label ?? I18n.of(context).t('lab.common.loading'),
      child: loader,
    );
  }
}

/// Squares in wave order: by their wave delay (column 110ms, row 80ms).
const _loaderOrder = [0, 3, 1, 6, 4, 2, 7, 5, 8];

/// How lit square [index] is (0 … 1) at [progress] (0 … 1): one square per ninth, in wave order.
/// The twin of `pixelLoaderCell` in `@feeef.dev/ui/pixel-art`.
double pixelLoaderCell(int index, double progress) =>
    (progress * 9 - _loaderOrder.indexOf(index)).clamp(0.0, 1.0);

class _LoaderPainter extends CustomPainter {
  _LoaderPainter({required this.color, required this.clock, this.progress})
    : super(repaint: clock);
  final Color color;
  final double? progress;

  /// The wave's clock (time since the loader appeared); null under reduced motion.
  final AnimationController? clock;

  /// `lab-pixel-loading`: 0%, 70%, 100% → (22%, 0.7); 35% → (100%, 1), ease-in-out per segment.
  static (double, double) _frame(double t) {
    double lerp(double a, double b, double p) =>
        a + (b - a) * Curves.easeInOut.transform(p);
    if (t < 0.35) {
      final p = t / 0.35;
      return (lerp(0.22, 1, p), lerp(0.7, 1, p));
    }
    if (t < 0.7) {
      final p = (t - 0.35) / 0.35;
      return (lerp(1, 0.22, p), lerp(1, 0.7, p));
    }
    return (0.22, 0.7);
  }

  @override
  void paint(Canvas canvas, Size size) {
    // A 3 × 3 grid with 2px gaps.
    final cell = (size.width - 4) / 3;
    final elapsed = clock == null
        ? null
        : (clock!.lastElapsedDuration ?? Duration.zero);
    for (var index = 0; index < 9; index++) {
      final col = index % 3, row = index ~/ 3;
      double opacity, scale;
      if (progress != null) {
        // The wave's resting and peak frames (opacity 0.22 → 1, scale 0.7 → 1).
        final lit = pixelLoaderCell(index, progress!);
        (opacity, scale) = (0.22 + 0.78 * lit, 0.7 + 0.3 * lit);
      } else if (elapsed == null) {
        (opacity, scale) = (0.7, 1);
      } else {
        final delay = col * 110 + row * 80;
        final ms = elapsed.inMicroseconds / 1000 - delay;
        // Before its first cycle a square shows its resting style.
        (opacity, scale) = ms < 0 ? (0.25, 1) : _frame((ms % 1200) / 1200);
      }
      final rect = Rect.fromLTWH(
        col * (cell + 2),
        row * (cell + 2),
        cell,
        cell,
      );
      final side = cell * scale;
      canvas.drawRect(
        Rect.fromCenter(center: rect.center, width: side, height: side),
        Paint()..color = color.withValues(alpha: color.a * opacity),
      );
    }
  }

  @override
  bool shouldRepaint(_LoaderPainter old) =>
      old.clock != clock || old.color != color || old.progress != progress;
}
