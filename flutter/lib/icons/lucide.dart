import 'package:flutter/widgets.dart';
import 'package:path_parsing/path_parsing.dart';

export 'lucide.g.dart';

/// One element of a Lucide icon, in its 24 × 24 view box.
sealed class LucideElement {
  const LucideElement();
  void addTo(Path path);
}

class LucideNodePath extends LucideElement {
  const LucideNodePath(this.d);
  final String d;
  @override
  void addTo(Path path) => writeSvgPathDataToPath(d, _PathProxy(path));
}

class LucideNodeCircle extends LucideElement {
  const LucideNodeCircle(this.cx, this.cy, this.r);
  final double cx, cy, r;
  @override
  void addTo(Path path) =>
      path.addOval(Rect.fromCircle(center: Offset(cx, cy), radius: r));
}

class LucideNodeEllipse extends LucideElement {
  const LucideNodeEllipse(this.cx, this.cy, this.rx, this.ry);
  final double cx, cy, rx, ry;
  @override
  void addTo(Path path) => path.addOval(
    Rect.fromCenter(center: Offset(cx, cy), width: rx * 2, height: ry * 2),
  );
}

class LucideNodeRect extends LucideElement {
  const LucideNodeRect(
    this.x,
    this.y,
    this.width,
    this.height,
    this.rx,
    this.ry,
  );
  final double x, y, width, height, rx, ry;
  @override
  void addTo(Path path) => path.addRRect(
    RRect.fromRectXY(Rect.fromLTWH(x, y, width, height), rx, ry),
  );
}

class LucideNodeLine extends LucideElement {
  const LucideNodeLine(this.x1, this.y1, this.x2, this.y2);
  final double x1, y1, x2, y2;
  @override
  void addTo(Path path) => path
    ..moveTo(x1, y1)
    ..lineTo(x2, y2);
}

List<Offset> _points(String points) {
  final values = points
      .trim()
      .split(RegExp(r'[\s,]+'))
      .map(double.parse)
      .toList();
  return [
    for (var i = 0; i + 1 < values.length; i += 2)
      Offset(values[i], values[i + 1]),
  ];
}

class LucideNodePolyline extends LucideElement {
  const LucideNodePolyline(this.points);
  final String points;
  @override
  void addTo(Path path) => path.addPolygon(_points(points), false);
}

class LucideNodePolygon extends LucideElement {
  const LucideNodePolygon(this.points);
  final String points;
  @override
  void addTo(Path path) => path.addPolygon(_points(points), true);
}

class _PathProxy extends PathProxy {
  _PathProxy(this.path);
  final Path path;
  @override
  void close() => path.close();
  @override
  void cubicTo(
    double x1,
    double y1,
    double x2,
    double y2,
    double x3,
    double y3,
  ) => path.cubicTo(x1, y1, x2, y2, x3, y3);
  @override
  void lineTo(double x, double y) => path.lineTo(x, y);
  @override
  void moveTo(double x, double y) => path.moveTo(x, y);
}

/// A Lucide icon's data: its name and elements.
class LucideIconData {
  const LucideIconData(this.name, this.elements);
  final String name;
  final List<LucideElement> elements;

  static final _paths = <String, Path>{};

  /// The icon outline in its 24 × 24 view box (cached).
  Path get path => _paths.putIfAbsent(name, () {
    final path = Path();
    for (final element in elements) {
      element.addTo(path);
    }
    return path;
  });
}

/// Draws a Lucide icon like lucide-react's `<svg>`: 24 × 24 view box, stroked with round caps and
/// joins, no fill, in the current icon colour. Size and colour come from [IconTheme] unless given;
/// controls set 18px and a 1.75 stroke like the web kit's CSS. Decorative unless [semanticLabel].
class LucideIcon extends StatelessWidget {
  const LucideIcon(
    this.data, {
    super.key,
    this.size,
    this.color,
    this.strokeWidth,
    this.semanticLabel,
  });

  final LucideIconData data;
  final double? size;
  final Color? color;

  /// In view-box units (lucide's default is 2).
  final double? strokeWidth;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    final theme = IconTheme.of(context);
    final side = size ?? theme.size ?? 24;
    final ink = color ?? theme.color ?? const Color(0xFF000000);
    final stroke = strokeWidth ?? LucideStroke.maybeOf(context) ?? 2;
    final icon = SizedBox.square(
      dimension: side,
      child: CustomPaint(painter: _LucidePainter(data, ink, stroke)),
    );
    return semanticLabel == null
        ? ExcludeSemantics(child: icon)
        : Semantics(label: semanticLabel, image: true, child: icon);
  }
}

/// The stroke width icons inherit below it (the web kit's `svg.lucide { stroke-width }` rules).
class LucideStroke extends InheritedWidget {
  const LucideStroke({super.key, required this.width, required super.child});
  final double width;
  static double? maybeOf(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<LucideStroke>()?.width;
  @override
  bool updateShouldNotify(LucideStroke old) => old.width != width;
}

class _LucidePainter extends CustomPainter {
  _LucidePainter(this.data, this.color, this.strokeWidth);
  final LucideIconData data;
  final Color color;
  final double strokeWidth;

  @override
  void paint(Canvas canvas, Size size) {
    final scale = size.width / 24;
    canvas.save();
    canvas.scale(scale);
    canvas.drawPath(
      data.path,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = strokeWidth
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round
        ..color = color,
    );
    canvas.restore();
  }

  @override
  bool shouldRepaint(_LucidePainter old) =>
      old.data != data || old.color != color || old.strokeWidth != strokeWidth;
}
