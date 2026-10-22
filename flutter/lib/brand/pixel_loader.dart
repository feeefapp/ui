import 'package:flutter/widgets.dart';

/// A nine-pixel loading wave: the twin of `PixelLoader` in `@feeef.dev/ui/pixel-art`. Squares in
/// the current text colour light up in a diagonal wave (1.2s, each square delayed by its column
/// and row). Use [decorative] when nearby text already announces the work.
class PixelLoader extends StatefulWidget {
  const PixelLoader({
    super.key,
    this.size = 20,
    this.label = 'Loading…',
    this.decorative = false,
    this.color,
  });

  /// Width and height in pixels.
  final double size;

  /// Accessible status text.
  final String label;

  /// Hides the loader from assistive technology.
  final bool decorative;

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
    final still = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
    if (still) {
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
    final still = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
    final loader = SizedBox.square(
      dimension: widget.size,
      child: AnimatedBuilder(
        animation: _clock,
        builder: (context, _) => CustomPaint(
          painter: _LoaderPainter(
            color: color,
            elapsed: still
                ? null
                : (_clock.lastElapsedDuration ?? Duration.zero),
          ),
        ),
      ),
    );
    if (widget.decorative) return ExcludeSemantics(child: loader);
    return Semantics(liveRegion: true, label: widget.label, child: loader);
  }
}

class _LoaderPainter extends CustomPainter {
  _LoaderPainter({required this.color, required this.elapsed});
  final Color color;

  /// Time since the loader appeared; null under reduced motion.
  final Duration? elapsed;

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
    for (var index = 0; index < 9; index++) {
      final col = index % 3, row = index ~/ 3;
      double opacity, scale;
      if (elapsed == null) {
        (opacity, scale) = (0.7, 1);
      } else {
        final delay = col * 110 + row * 80;
        final ms = elapsed!.inMicroseconds / 1000 - delay;
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
      old.elapsed != elapsed || old.color != color;
}
