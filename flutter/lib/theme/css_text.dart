import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

final _shifts = <(String?, double, FontWeight?, double, double), double>{};

/// How far (px) Flutter's text baseline sits from where a browser puts it in a CSS line box of
/// [lineHeight]. Browsers round the font's ascent and descent to whole device pixels before
/// splitting the line height; Flutter uses exact values, so text can land up to a device pixel
/// off. Shift the label by this to sit exactly where the web kit's text sits.
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
    // Blink lays text out in device pixels: it rounds the font's ascent and descent at the
    // device scale, floors the half leading, and paints there (measured against Chrome at 1x and
    // 2x for 10-24px in parity/: 16/20 at 2x lands on 31 device px, not 30).
    final a = (ascent * devicePixelRatio).round();
    final d = (descent * devicePixelRatio).round();
    final line = lineHeight * devicePixelRatio;
    final browser = (((line - (a + d)) / 2).floor() + a) / devicePixelRatio;
    return browser - flutter;
  });
}

/// Places [child] (a label in a CSS-sized line box) on the browser's baseline.
class CssBaseline extends StatelessWidget {
  const CssBaseline({super.key, required this.lineHeight, required this.child});
  final double lineHeight;
  final Widget child;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties.add(DoubleProperty('lineHeight', lineHeight));
  }

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
