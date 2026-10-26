import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

const _names = [
  'Amina',
  'Yacine',
  'Sara',
  'Karim',
  'Lina',
  'Omar',
  'Nour',
  'Riad',
];

class Shelf extends StatelessWidget {
  const Shelf({super.key});

  @override
  Widget build(BuildContext context) => SizedBox(
    width: double.infinity,
    child: Carousel(
      label: 'Recent customers',
      slideWidth: const .px(150),
      align: .start,
      effect: .none,
      dots: false,
      gap: 10,
      children: [
        for (final (i, name) in _names.indexed)
          _Card(
            art: HSLColor.fromAHSL(1, i * 40.0, 0.45, 0.7).toColor(),
            title: name,
            detail: '${3 + i} orders',
          ),
      ],
    ),
  );
}

/// `.cd-card` with square art.
class _Card extends StatelessWidget {
  const _Card({required this.art, required this.title, required this.detail});
  final Color art;
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
            aspectRatio: 1,
            child: DecoratedBox(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(
                  14 * theme.sizes.radiusScale,
                ),
                color: art,
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
