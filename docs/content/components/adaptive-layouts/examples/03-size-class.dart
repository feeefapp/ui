import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class SizeClassCard extends StatefulWidget {
  const SizeClassCard({super.key});

  @override
  State<SizeClassCard> createState() => _SizeClassCardState();
}

class _SizeClassCardState extends State<SizeClassCard> {
  double _width = 560;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: double.infinity,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 16,
      children: [
        Slider(
          label: 'Width',
          min: 240,
          max: 640,
          value: _width,
          onValueChange: (v) => setState(() => _width = v),
        ),
        _Frame(width: _width, child: const _ProductCard()),
      ],
    ),
  );
}

class _ProductCard extends StatelessWidget {
  const _ProductCard();

  @override
  Widget build(BuildContext context) => SizeClassScope(
    breakpoint: 420,
    child: Builder(
      builder: (context) {
        final size = SizeClass.of(context);
        final theme = ThemeProvider.of(context);
        final compact = size == SizeClass.compact;
        final art = AspectRatio(
          aspectRatio: compact ? 16 / 9 : 1,
          child: DecoratedBox(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16 * theme.sizes.radiusScale),
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xFFEAB486), Color(0xFFA5B635)],
              ),
            ),
          ),
        );
        final text = Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Linen kaftan',
              style: TextStyle(fontWeight: FontWeight.w700),
            ),
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                '6 800 DA · ${size.name} layout',
                style: TextStyle(color: theme.colors.muted),
              ),
            ),
          ],
        );
        return compact
            ? Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                spacing: 14,
                children: [art, text],
              )
            : Row(
                spacing: 14,
                children: [
                  SizedBox(width: 96, child: art),
                  Expanded(child: text),
                ],
              );
      },
    ),
  );
}

/// `.ad-frame`: a dashed box [width] px wide (never wider than the stage), 14px inside.
class _Frame extends StatelessWidget {
  const _Frame({required this.width, required this.child});
  final double width;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    return Align(
      alignment: AlignmentDirectional.centerStart,
      child: CustomPaint(
        painter: _DashedBorder(theme.colors.line, theme.sizes.radiusGroup),
        child: Container(
          width: width,
          padding: const EdgeInsets.all(15),
          child: child,
        ),
      ),
    );
  }
}

/// A 1px dashed CSS border (3px dashes) around a rounded box.
class _DashedBorder extends CustomPainter {
  const _DashedBorder(this.color, this.radius);
  final Color color;
  final double radius;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke;
    final path = Path()
      ..addRRect(
        RRect.fromRectAndRadius(
          (Offset.zero & size).deflate(0.5),
          Radius.circular(radius - 0.5),
        ),
      );
    for (final metric in path.computeMetrics()) {
      for (var d = 0.0; d < metric.length; d += 6) {
        canvas.drawPath(metric.extractPath(d, d + 3), paint);
      }
    }
  }

  @override
  bool shouldRepaint(_DashedBorder old) =>
      old.color != color || old.radius != radius;
}
