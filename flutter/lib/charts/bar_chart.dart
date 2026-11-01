import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/widgets.dart';

import '../theme.dart';
import 'scale.dart';

/// One stacked layer of a [BarChart] (bottom first).
class BarSeries {
  const BarSeries({
    required this.label,
    required this.values,
    required this.color,
  });

  final String label;
  final List<double> values;
  final Color color;
}

/// A line drawn over the bars, e.g. the comparison period (dashed).
class LineSeries {
  const LineSeries({
    required this.label,
    required this.values,
    required this.color,
    this.dashed = false,
  });

  final String label;
  final List<double> values;
  final Color color;
  final bool dashed;
}

/// Stacked bars over time with optional lines: the kit's daily chart.
///
/// - Time follows the reading direction: the oldest bucket at the start (right in Arabic), the
///   value axis on the start edge.
/// - The value axis uses [niceScale] (round ticks, at most 4 intervals) and [compactNumber]
///   labels, measured so they never wrap or collide; x labels skip buckets to fit.
/// - Tap or hover selects a bucket ([onSelect]); the others fade so the selection reads. Data
///   never animates.
class BarChart extends StatefulWidget {
  const BarChart({
    super.key,
    required this.labels,
    this.bars = const [],
    this.lines = const [],
    this.height = 200,
    this.formatValue = compactNumber,
    this.selected,
    this.onSelect,
    this.semanticLabel,
  });

  /// One label per bucket (the x axis).
  final List<String> labels;
  final List<BarSeries> bars;
  final List<LineSeries> lines;
  final double height;
  final String Function(num) formatValue;

  /// The highlighted bucket, if the parent keeps it.
  final int? selected;
  final ValueChanged<int?>? onSelect;
  final String? semanticLabel;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(IterableProperty<String>('labels', labels))
      ..add(
        IterableProperty<BarSeries>(
          'bars',
          bars,
          defaultValue: const <BarSeries>[],
        ),
      )
      ..add(
        IterableProperty<LineSeries>(
          'lines',
          lines,
          defaultValue: const <LineSeries>[],
        ),
      )
      ..add(DoubleProperty('height', height, defaultValue: 200.0))
      ..add(
        DiagnosticsProperty<String Function(num)>(
          'formatValue',
          formatValue,
          description: 'custom',
          defaultValue: compactNumber,
        ),
      )
      ..add(IntProperty('selected', selected, defaultValue: null))
      ..add(ObjectFlagProperty<ValueChanged<int?>?>.has('onSelect', onSelect))
      ..add(StringProperty('semanticLabel', semanticLabel, defaultValue: null));
  }

  @override
  State<BarChart> createState() => _BarChartState();
}

class _BarChartState extends State<BarChart> {
  int? _hover;

  int? _indexAt(Offset local, Size size, _Layout layout) {
    final n = widget.labels.length;
    if (n == 0) return null;
    final dx = layout.rtl ? size.width - local.dx : local.dx;
    final i = ((dx - layout.plot.left) / layout.slot).floor();
    return i >= 0 && i < n ? i : null;
  }

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final rtl = Directionality.of(context) == TextDirection.rtl;
    final active = widget.selected ?? _hover;
    return Semantics(
      label: widget.semanticLabel,
      container: true,
      child: SizedBox(
        height: widget.height,
        child: LayoutBuilder(
          builder: (context, box) {
            final size = Size(box.maxWidth, widget.height);
            final painter = _BarChartPainter(
              base: DefaultTextStyle.of(context).style,
              labels: widget.labels,
              bars: widget.bars,
              lines: widget.lines,
              format: widget.formatValue,
              colors: theme.colors,
              rtl: rtl,
              active: active,
            );
            final layout = painter.layout(size);
            return MouseRegion(
              onHover: (e) {
                final i = _indexAt(e.localPosition, size, layout);
                if (i != _hover) setState(() => _hover = i);
              },
              onExit: (_) => setState(() => _hover = null),
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTapUp: widget.onSelect == null
                    ? null
                    : (d) {
                        final i = _indexAt(d.localPosition, size, layout);
                        widget.onSelect!(i == widget.selected ? null : i);
                      },
                dragStartBehavior: DragStartBehavior.down,
                child: CustomPaint(size: size, painter: painter),
              ),
            );
          },
        ),
      ),
    );
  }
}

class _Layout {
  _Layout(
    this.plot,
    this.slot,
    this.scale,
    this.axisWidth,
    this.rtl,
    this.labelEvery,
  );

  /// The bars' area in start-relative coordinates (left = reading start).
  final Rect plot;
  final double slot;
  final NiceScale scale;
  final double axisWidth;
  final bool rtl;
  final int labelEvery;
}

class _BarChartPainter extends CustomPainter {
  _BarChartPainter({
    required this.base,
    required this.labels,
    required this.bars,
    required this.lines,
    required this.format,
    required this.colors,
    required this.rtl,
    required this.active,
  });

  /// The surrounding text style, so axis labels use the app's font.
  final TextStyle base;
  final List<String> labels;
  final List<BarSeries> bars;
  final List<LineSeries> lines;
  final String Function(num) format;
  final ColorTokens colors;
  final bool rtl;
  final int? active;

  static const _labelSize = 11.0;
  static const _axisGap = 8.0;
  static const _bottom = 20.0;
  static const _top = 8.0;

  TextPainter _text(String s, {Color? color, FontWeight? weight}) =>
      TextPainter(
        text: TextSpan(
          text: s,
          style: base.merge(
            TextStyle(
              fontSize: _labelSize,
              height: 1.2,
              color: color ?? colors.muted,
              fontWeight: weight,
              fontFeatures: const [ui.FontFeature.tabularFigures()],
            ),
          ),
        ),
        textDirection: TextDirection.ltr,
        maxLines: 1,
      )..layout();

  _Layout layout(Size size) {
    final n = labels.length;
    var max = 0.0;
    for (var i = 0; i < n; i++) {
      var stack = 0.0;
      for (final b in bars) {
        stack += i < b.values.length ? b.values[i] : 0;
      }
      max = math.max(max, stack);
      for (final l in lines) {
        if (i < l.values.length) max = math.max(max, l.values[i]);
      }
    }
    final scale = niceScale(max * 1.04);
    final axisWidth = scale.ticks
        .map((t) => _text(format(t)).width)
        .fold(0.0, math.max);
    final plot = Rect.fromLTRB(
      axisWidth + _axisGap,
      _top,
      size.width,
      size.height - _bottom,
    );
    final slot = n == 0 ? plot.width : plot.width / n;
    final widest = labels.map((l) => _text(l).width).fold(0.0, math.max);
    final every = slot <= 0 ? 1 : math.max(1, ((widest + 10) / slot).ceil());
    return _Layout(plot, slot, scale, axisWidth, rtl, every);
  }

  double _x(_Layout l, Size size, double startX) =>
      l.rtl ? size.width - startX : startX;

  @override
  void paint(Canvas canvas, Size size) {
    final l = layout(size);
    final plot = l.plot;
    final grid = Paint()
      ..color = colors.line
      ..strokeWidth = 1;

    // Grid and value labels on the start edge.
    for (final t in l.scale.ticks) {
      final y = plot.bottom - l.scale.fraction(t) * plot.height;
      _dashed(
        canvas,
        [Offset(_x(l, size, plot.left), y), Offset(_x(l, size, plot.right), y)],
        grid,
        solid: t == 0,
      );
      final tp = _text(format(t));
      final x = l.rtl ? size.width - l.axisWidth : l.axisWidth - tp.width;
      tp.paint(canvas, Offset(x, y - tp.height / 2));
    }

    final n = labels.length;
    final barWidth = math.min(l.slot * 0.64, 28.0);
    for (var i = 0; i < n; i++) {
      final cx = plot.left + (i + 0.5) * l.slot;
      final faded = active != null && active != i;
      var base = 0.0;
      for (final b in bars) {
        final v = i < b.values.length ? b.values[i] : 0.0;
        if (v <= 0) continue;
        final y0 = plot.bottom - l.scale.fraction(base) * plot.height;
        final y1 = plot.bottom - l.scale.fraction(base + v) * plot.height;
        base += v;
        final left = _x(l, size, cx - barWidth / 2);
        final right = _x(l, size, cx + barWidth / 2);
        canvas.drawRRect(
          RRect.fromRectAndRadius(
            Rect.fromLTRB(
              math.min(left, right),
              y1,
              math.max(left, right),
              y0 - 0.5,
            ),
            const Radius.circular(2),
          ),
          Paint()
            ..color = faded
                ? b.color.withValues(alpha: b.color.a * 0.35)
                : b.color,
        );
      }
      if (i % l.labelEvery == 0 || i == active) {
        final tp = _text(
          labels[i],
          color: i == active ? colors.ink : null,
          weight: i == active ? FontWeight.w600 : null,
        );
        final x = _x(l, size, cx) - tp.width / 2;
        tp.paint(
          canvas,
          Offset(x.clamp(0, size.width - tp.width), plot.bottom + 5),
        );
      }
    }

    for (final line in lines) {
      final pts = <Offset>[
        for (var i = 0; i < math.min(n, line.values.length); i++)
          Offset(
            _x(l, size, plot.left + (i + 0.5) * l.slot),
            plot.bottom - l.scale.fraction(line.values[i]) * plot.height,
          ),
      ];
      final p = Paint()
        ..color = line.color
        ..strokeWidth = 1.6
        ..style = PaintingStyle.stroke
        ..strokeJoin = StrokeJoin.round;
      _dashed(canvas, pts, p, solid: !line.dashed);
    }
  }

  void _dashed(
    Canvas canvas,
    List<Offset> pts,
    Paint paint, {
    bool solid = false,
  }) {
    if (pts.length < 2) return;
    if (solid) {
      canvas.drawPath(Path()..addPolygon(pts, false), paint);
      return;
    }
    const dash = 4.0, gap = 3.0;
    var on = true;
    var left = dash;
    for (var s = 0; s < pts.length - 1; s++) {
      var a = pts[s];
      final b = pts[s + 1];
      var remaining = (b - a).distance;
      final dir = remaining == 0 ? Offset.zero : (b - a) / remaining;
      while (remaining > 0) {
        final step = math.min(left, remaining);
        final next = a + dir * step;
        if (on) canvas.drawLine(a, next, paint);
        a = next;
        remaining -= step;
        left -= step;
        if (left <= 0) {
          on = !on;
          left = on ? dash : gap;
        }
      }
    }
  }

  @override
  bool shouldRepaint(_BarChartPainter old) =>
      old.base != base ||
      old.labels != labels ||
      old.bars != bars ||
      old.lines != lines ||
      old.colors != colors ||
      old.rtl != rtl ||
      old.active != active;
}
