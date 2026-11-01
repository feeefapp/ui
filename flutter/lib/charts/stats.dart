import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/widgets.dart';

import '../brand/geometry.dart';
import '../icons/lucide.dart';
import '../theme.dart';
import '../theme/color_mix.dart';

const _tabular = [ui.FontFeature.tabularFigures()];

/// Which way a change is good for: up (orders) or down (returns).
enum DeltaTone { positive, negative, neutral }

/// A change against the comparison period: "▲ 12%" / "▼ 3 pt" in a soft chip, green when
/// good, red when bad, grey when flat or unknown. Never colour alone: the arrow carries it too.
class DeltaChip extends StatelessWidget {
  const DeltaChip({
    super.key,
    required this.text,
    this.tone = DeltaTone.neutral,
    this.up,
  });

  final String text;
  final DeltaTone tone;

  /// Arrow direction; null draws no arrow (flat or new).
  final bool? up;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final ink = switch (tone) {
      DeltaTone.positive => c.success,
      DeltaTone.negative => c.danger,
      DeltaTone.neutral => c.muted,
    };
    return DecoratedBox(
      decoration: ShapeDecoration(
        color: mixSrgb(ink, 0.12, c.surface),
        shape: SuperellipseBorder(radius: 6 * theme.sizes.radiusScale),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          spacing: 2,
          children: [
            if (up != null)
              up!
                  ? LucideArrowUp(size: 11, color: ink, strokeWidth: 2.4)
                  : LucideArrowDown(size: 11, color: ink, strokeWidth: 2.4),
            Text(
              text,
              textDirection: TextDirection.ltr,
              style: TextStyle(
                fontSize: 11,
                height: 16 / 11,
                fontWeight: FontWeight.w500,
                color: ink,
                fontFeatures: _tabular,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// A two-part bar: the decided share solid, the still-open share hatched. Used to show how
/// mature a rate is (e.g. 58 % of parcels decided, 42 % still in transit).
class SegmentMeter extends StatelessWidget {
  const SegmentMeter({
    super.key,
    required this.decided,
    required this.pending,
    this.height = 4,
  });

  /// Fractions of the whole, 0..1.
  final double decided;
  final double pending;
  final double height;

  @override
  Widget build(BuildContext context) {
    final c = ThemeProvider.of(context).colors;
    return SizedBox(
      height: height,
      child: CustomPaint(
        painter: _MeterPainter(
          decided: decided.clamp(0, 1),
          pending: pending.clamp(0, 1),
          ink: c.ink,
          track: c.line,
          rtl: Directionality.of(context) == TextDirection.rtl,
        ),
      ),
    );
  }
}

class _MeterPainter extends CustomPainter {
  _MeterPainter({
    required this.decided,
    required this.pending,
    required this.ink,
    required this.track,
    required this.rtl,
  });

  final double decided, pending;
  final Color ink, track;
  final bool rtl;

  @override
  void paint(Canvas canvas, Size size) {
    final r = Radius.circular(size.height / 2);
    final whole = RRect.fromRectAndRadius(Offset.zero & size, r);
    canvas.save();
    canvas.clipRRect(whole);
    canvas.drawRect(Offset.zero & size, Paint()..color = track);
    Rect span(double from, double to) => rtl
        ? Rect.fromLTRB(
            size.width * (1 - to),
            0,
            size.width * (1 - from),
            size.height,
          )
        : Rect.fromLTRB(size.width * from, 0, size.width * to, size.height);
    canvas.drawRect(span(0, decided), Paint()..color = ink);
    final hatch = span(decided, math.min(1, decided + pending));
    canvas.save();
    canvas.clipRect(hatch);
    final p = Paint()
      ..color = ink.withValues(alpha: ink.a * 0.45)
      ..strokeWidth = 1.5;
    for (
      var x = hatch.left - size.height;
      x < hatch.right + size.height;
      x += 4
    ) {
      canvas.drawLine(Offset(x, size.height), Offset(x + size.height, 0), p);
    }
    canvas.restore();
    canvas.restore();
  }

  @override
  bool shouldRepaint(_MeterPainter old) =>
      old.decided != decided ||
      old.pending != pending ||
      old.ink != ink ||
      old.rtl != rtl;
}

/// A small trend line, latest value at the reading end; [compare] draws dashed behind it.
class Sparkline extends StatelessWidget {
  const Sparkline({
    super.key,
    required this.values,
    this.compare,
    this.color,
    this.height = 28,
  });

  final List<double> values;
  final List<double>? compare;
  final Color? color;
  final double height;

  @override
  Widget build(BuildContext context) {
    final c = ThemeProvider.of(context).colors;
    return SizedBox(
      height: height,
      width: double.infinity,
      child: CustomPaint(
        painter: _SparkPainter(
          values: values,
          compare: compare,
          color: color ?? c.ink,
          compareColor: c.muted.withValues(alpha: c.muted.a * 0.6),
          rtl: Directionality.of(context) == TextDirection.rtl,
        ),
      ),
    );
  }
}

class _SparkPainter extends CustomPainter {
  _SparkPainter({
    required this.values,
    required this.compare,
    required this.color,
    required this.compareColor,
    required this.rtl,
  });

  final List<double> values;
  final List<double>? compare;
  final Color color, compareColor;
  final bool rtl;

  @override
  void paint(Canvas canvas, Size size) {
    final all = [...values, ...?compare];
    if (values.length < 2 || all.isEmpty) return;
    final max = all.reduce(math.max);
    final top = max <= 0 ? 1.0 : max;
    Path path(List<double> v) {
      final p = Path();
      for (var i = 0; i < v.length; i++) {
        final t = i / (v.length - 1);
        final x = (rtl ? 1 - t : t) * size.width;
        final y = size.height - 2 - (v[i] / top) * (size.height - 4);
        i == 0 ? p.moveTo(x, y) : p.lineTo(x, y);
      }
      return p;
    }

    if (compare != null && compare!.length >= 2) {
      final dashed = Paint()
        ..color = compareColor
        ..strokeWidth = 1.2
        ..style = PaintingStyle.stroke;
      for (final metric in path(compare!).computeMetrics()) {
        for (var d = 0.0; d < metric.length; d += 6) {
          canvas.drawPath(
            metric.extractPath(d, math.min(d + 3, metric.length)),
            dashed,
          );
        }
      }
    }
    canvas.drawPath(
      path(values),
      Paint()
        ..color = color
        ..strokeWidth = 1.6
        ..style = PaintingStyle.stroke
        ..strokeJoin = StrokeJoin.round,
    );
  }

  @override
  bool shouldRepaint(_SparkPainter old) =>
      old.values != values ||
      old.compare != compare ||
      old.color != color ||
      old.rtl != rtl;
}

/// A metric on its own content card: label, big figure, a [DeltaChip], then an optional
/// [chart] (sparkline or meter) and a muted [footer]. Tappable when [onTap] is set
/// (it opens the metric's analytics), selectable with [selected].
class StatTile extends StatelessWidget {
  const StatTile({
    super.key,
    required this.label,
    required this.value,
    this.delta,
    this.chart,
    this.footer,
    this.onTap,
    this.selected = false,
  });

  final String label;
  final String value;
  final Widget? delta;
  final Widget? chart;
  final String? footer;
  final VoidCallback? onTap;
  final bool selected;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final shape = SuperellipseBorder(
      radius: theme.sizes.radiusPanel,
      side: BorderSide(
        color: selected ? c.ink : c.line,
        width: selected ? 1.5 : 1,
      ),
    );
    Widget tile = DecoratedBox(
      decoration: ShapeDecoration(color: c.surface, shape: shape),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          spacing: 6,
          children: [
            Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontSize: 13, height: 20 / 13, color: c.muted),
            ),
            Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              spacing: 8,
              children: [
                Flexible(
                  child: FittedBox(
                    fit: BoxFit.scaleDown,
                    alignment: AlignmentDirectional.centerStart,
                    child: Text(
                      value,
                      maxLines: 1,
                      style: TextStyle(
                        fontSize: 24,
                        height: 30 / 24,
                        fontWeight: FontWeight.w600,
                        letterSpacing: -0.3,
                        color: c.ink,
                        fontFeatures: _tabular,
                      ),
                    ),
                  ),
                ),
                ?delta,
              ],
            ),
            ?chart,
            if (footer != null)
              Text(
                footer!,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(fontSize: 12, height: 16 / 12, color: c.muted),
              ),
          ],
        ),
      ),
    );
    if (onTap != null) {
      tile = MouseRegion(
        cursor: SystemMouseCursors.click,
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: onTap,
          child: tile,
        ),
      );
    }
    return Semantics(
      button: onTap != null,
      label: '$label $value',
      child: tile,
    );
  }
}

/// One line of a ranked list: name, a bar for the share, the count and an optional rate
/// (e.g. delivery rate) that can be flagged as bad. Tappable to drill down.
class RankedRow extends StatelessWidget {
  const RankedRow({
    super.key,
    required this.label,
    required this.value,
    required this.fraction,
    this.rate,
    this.rateBad = false,
    this.emphasis = false,
    this.onTap,
  });

  final String label;
  final String value;
  final double fraction;
  final String? rate;
  final bool rateBad;
  final bool emphasis;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final c = ThemeProvider.of(context).colors;
    final figures = TextStyle(
      fontSize: 12,
      height: 16 / 12,
      color: c.ink,
      fontFeatures: _tabular,
    );
    Widget row = Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        spacing: 10,
        children: [
          Expanded(
            flex: 7,
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontSize: 13, height: 20 / 13, color: c.ink),
            ),
          ),
          Expanded(
            flex: 5,
            child: SizedBox(
              height: 6,
              child: CustomPaint(
                painter: _ShareBar(
                  fraction: fraction.clamp(0, 1),
                  fill: emphasis
                      ? c.ink
                      : c.muted.withValues(alpha: c.muted.a * 0.55),
                  track: c.line,
                  rtl: Directionality.of(context) == TextDirection.rtl,
                ),
              ),
            ),
          ),
          SizedBox(
            width: 44,
            child: Text(
              value,
              textAlign: TextAlign.end,
              textDirection: TextDirection.ltr,
              style: figures,
            ),
          ),
          if (rate != null)
            SizedBox(
              width: 40,
              child: Text(
                rate!,
                textAlign: TextAlign.end,
                textDirection: TextDirection.ltr,
                style: figures.copyWith(color: rateBad ? c.danger : c.muted),
              ),
            ),
        ],
      ),
    );
    if (onTap != null) {
      row = MouseRegion(
        cursor: SystemMouseCursors.click,
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: onTap,
          child: row,
        ),
      );
    }
    return row;
  }
}

class _ShareBar extends CustomPainter {
  _ShareBar({
    required this.fraction,
    required this.fill,
    required this.track,
    required this.rtl,
  });

  final double fraction;
  final Color fill, track;
  final bool rtl;

  @override
  void paint(Canvas canvas, Size size) {
    final r = Radius.circular(size.height / 2);
    canvas.drawRRect(
      RRect.fromRectAndRadius(Offset.zero & size, r),
      Paint()..color = track,
    );
    final w = size.width * fraction;
    if (w <= 0) return;
    final rect = rtl
        ? Rect.fromLTWH(size.width - w, 0, w, size.height)
        : Rect.fromLTWH(0, 0, w, size.height);
    canvas.drawRRect(RRect.fromRectAndRadius(rect, r), Paint()..color = fill);
  }

  @override
  bool shouldRepaint(_ShareBar old) =>
      old.fraction != fraction ||
      old.fill != fill ||
      old.track != track ||
      old.rtl != rtl;
}

/// A colour key for chart series.
class ChartLegend extends StatelessWidget {
  const ChartLegend({super.key, required this.items});

  /// (label, colour, dashed)
  final List<(String, Color, bool)> items;

  @override
  Widget build(BuildContext context) {
    final c = ThemeProvider.of(context).colors;
    return Wrap(
      spacing: 12,
      runSpacing: 4,
      children: [
        for (final (label, color, dashed) in items)
          Row(
            mainAxisSize: MainAxisSize.min,
            spacing: 5,
            children: [
              SizedBox(
                width: 10,
                height: 10,
                child: DecoratedBox(
                  decoration: ShapeDecoration(
                    color: dashed ? null : color,
                    shape: SuperellipseBorder(
                      radius: 3,
                      side: dashed ? BorderSide(color: color) : BorderSide.none,
                    ),
                  ),
                ),
              ),
              Text(
                label,
                style: TextStyle(fontSize: 12, height: 16 / 12, color: c.muted),
              ),
            ],
          ),
      ],
    );
  }
}
