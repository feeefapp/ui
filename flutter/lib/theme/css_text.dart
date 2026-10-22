import 'package:flutter/widgets.dart';

final _shifts = <(String?, double, FontWeight?, double, double), double>{};

/// How far (px) Flutter's text baseline sits from where a browser puts it in a CSS line box of
/// [lineHeight]. Browsers round the font's ascent and descent to whole pixels before splitting the
/// line height; Flutter uses exact values, so text can land up to a device pixel lower. Shift the
/// label by this to sit exactly where the web kit's text sits.
double cssBaselineShift(
  TextStyle style,
  double lineHeight,
  double devicePixelRatio,
) {
  final key = (
    style.fontFamily,
    style.fontSize ?? 14,
    style.fontWeight,
    lineHeight,
    devicePixelRatio,
  );
  return _shifts.putIfAbsent(key, () {
    final painter = TextPainter(
      text: TextSpan(
        text: 'Hg',
        // A fresh style: copyWith(height: null) would keep the line height.
        style: TextStyle(
          fontFamily: style.fontFamily,
          fontFamilyFallback: style.fontFamilyFallback,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    final metrics = painter.computeLineMetrics();
    painter.dispose();
    if (metrics.isEmpty) return 0;
    final ascent = metrics.first.ascent;
    final descent = metrics.first.descent;
    final flutter = (lineHeight - (ascent + descent)) / 2 + ascent;
    // Blink rounds ascent and descent to whole CSS pixels, then rounds the half leading away from
    // zero (measured against Chrome: -0.5 → -1 at 14px, +0.5 → +1 at 13px).
    final a = ascent.round();
    final d = descent.round();
    final browser = ((lineHeight - (a + d)) / 2).round() + a;
    return browser - flutter;
  });
}

/// Places [child] (a label in a CSS-sized line box) on the browser's baseline.
class CssBaseline extends StatelessWidget {
  const CssBaseline({super.key, required this.lineHeight, required this.child});
  final double lineHeight;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final style = DefaultTextStyle.of(context).style;
    final shift = cssBaselineShift(
      style,
      lineHeight,
      MediaQuery.maybeDevicePixelRatioOf(context) ?? 1,
    );
    return shift.abs() < 0.01
        ? child
        : Transform.translate(offset: Offset(0, shift), child: child);
  }
}
