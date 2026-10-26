import 'dart:math' as math;

import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

const _products = [
  (name: 'Linen kaftan', price: '6 800 DA', hue: 28.0),
  (name: 'Leather babouches', price: '3 200 DA', hue: 12.0),
  (name: 'Woven tote', price: '2 400 DA', hue: 48.0),
  (name: 'Silk scarf', price: '1 900 DA', hue: 330.0),
  (name: 'Clay mug set', price: '2 100 DA', hue: 190.0),
];

class ProductCarousel extends StatelessWidget {
  const ProductCarousel({super.key});

  @override
  Widget build(BuildContext context) => SizedBox(
    width: double.infinity,
    child: Carousel(
      label: 'Featured products',
      slideWidth: const .fraction(0.62),
      children: [
        for (final p in _products)
          _Card(
            art: _CssGradient(135, [
              _hsl(p.hue, 0.7, 0.72),
              _hsl(p.hue + 40, 0.55, 0.46),
            ]),
            title: p.name,
            detail: p.price,
          ),
      ],
    ),
  );
}

/// `.cd-card`: art (4:3), name and price on a faint ink tint.
class _Card extends StatelessWidget {
  const _Card({required this.art, required this.title, required this.detail});
  final Gradient art;
  final String title, detail;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(theme.sizes.radiusGroup),
        color: Color.lerp(c.surface, c.ink, 0.04),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 8,
        children: [
          AspectRatio(
            aspectRatio: 4 / 3,
            child: DecoratedBox(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(
                  14 * theme.sizes.radiusScale,
                ),
                gradient: art,
              ),
            ),
          ),
          Text(
            title,
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
          ),
          Text(detail, style: TextStyle(fontSize: 13, color: c.muted)),
        ],
      ),
    );
  }
}

Color _hsl(double hue, double saturation, double lightness) =>
    HSLColor.fromAHSL(1, hue % 360, saturation, lightness).toColor();

/// CSS `linear-gradient(<angle>deg, a, b)`: the gradient line runs at [angle] and is long enough
/// for the corners to get the end colours, whatever the box's aspect.
class _CssGradient extends LinearGradient {
  const _CssGradient(this.angle, List<Color> colors) : super(colors: colors);
  final double angle;

  @override
  Shader createShader(Rect rect, {TextDirection? textDirection}) {
    final a = angle * math.pi / 180;
    final dx = math.sin(a), dy = -math.cos(a);
    final length = (rect.width * dx).abs() + (rect.height * dy).abs();
    final half = Offset(dx, dy) * length / 2;
    return LinearGradient(
      begin: Alignment(
        -half.dx / (rect.width / 2),
        -half.dy / (rect.height / 2),
      ),
      end: Alignment(half.dx / (rect.width / 2), half.dy / (rect.height / 2)),
      colors: colors,
    ).createShader(rect);
  }
}
