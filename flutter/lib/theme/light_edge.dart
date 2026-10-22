import 'dart:ui' as ui;

import 'package:flutter/painting.dart';

import '../brand/geometry.dart';

/// `.lab-light-edge::after` from the web kit's system.css: a static specular rim, a 135° gradient
/// painted on the 1px border ring of a floating material.
void paintLightEdge(
  Canvas canvas,
  Size size,
  double radius, {
  required Color light,
  required Color low,
}) {
  final rect = Offset.zero & size;
  // CSS gradient line length for 135°: |w·sin| + |h·cos|, centred on the box.
  final half = (size.width + size.height) / 2 * 0.7071067811865476;
  const direction = Offset(0.7071067811865476, 0.7071067811865476);
  canvas.drawPath(
    superellipsePath(rect, [radius, radius, radius, radius], inset: 0.5),
    Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1
      ..shader = ui.Gradient.linear(
        rect.center - direction * half,
        rect.center + direction * half,
        [light, low, const Color(0x00000000), const Color(0x00000000), low],
        const [0, 0.22, 0.48, 0.72, 1],
      ),
  );
}
