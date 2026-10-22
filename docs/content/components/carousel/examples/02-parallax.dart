import 'dart:math' as math;

import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

const _banners = [
  (
    title: 'Ramadan collection',
    text: 'Free delivery on orders over 5 000 DA',
    hue: 150.0,
  ),
  (title: 'New in: brass lamps', text: 'Handmade in Constantine', hue: 38.0),
  (title: 'Gift cards', text: 'From 1 000 DA', hue: 280.0),
];

class Banners extends StatelessWidget {
  const Banners({super.key});

  @override
  Widget build(BuildContext context) => SizedBox(
    width: double.infinity,
    child: Carousel(
      label: 'Promotions',
      slideWidth: const .fraction(0.9),
      effect: .parallax,
      gap: 10,
      children: [
        for (final b in _banners)
          _Banner(
            title: b.title,
            text: b.text,
            // Marked media drifts against the scroll.
            media: _CssGradient(120, [
              _hsl(b.hue, 0.55, 0.38),
              _hsl(b.hue + 50, 0.6, 0.58),
            ]),
          ),
      ],
    ),
  );
}

/// `.cd-banner`: 220px, text at the bottom over a drifting gradient.
class _Banner extends StatelessWidget {
  const _Banner({required this.title, required this.text, required this.media});
  final String title, text;
  final Gradient media;

  @override
  Widget build(BuildContext context) => ClipRRect(
    borderRadius: BorderRadius.circular(
      ThemeProvider.of(context).sizes.radiusGroup,
    ),
    child: SizedBox(
      height: 220,
      child: Stack(
        children: [
          Positioned.fill(
            child: CarouselParallax(
              child: DecoratedBox(decoration: BoxDecoration(gradient: media)),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(20),
            child: DefaultTextStyle.merge(
              style: const TextStyle(color: Color(0xFFFFFFFF)),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.end,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w500,
                      letterSpacing: 22 * -0.035,
                      height: 1.12,
                      leadingDistribution: TextLeadingDistribution.even,
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Opacity(opacity: 0.9, child: Text(text)),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    ),
  );
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
