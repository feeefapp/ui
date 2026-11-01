import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

import '../theme.dart';
import 'stats.dart' show ProportionPart;

const _tabular = [ui.FontFeature.tabularFigures()];

/// Shares of a whole as a ring, with an optional value and caption in the middle: orders by
/// source, sales by channel. Parts run clockwise from the top in the order given; empty parts
/// are skipped. Pair it with a legend that carries the numbers (colour never stands alone).
class DonutChart extends StatelessWidget {
  const DonutChart({
    super.key,
    required this.parts,
    this.centerValue,
    this.centerLabel,
    this.thickness = 14,
    this.selected,
    this.semanticLabel,
  });

  final List<ProportionPart> parts;
  final String? centerValue;
  final String? centerLabel;
  final double thickness;

  /// Index of the part to stress; the others fade.
  final int? selected;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    final c = ThemeProvider.of(context).colors;
    return Semantics(
      label:
          semanticLabel ??
          [for (final p in parts) '${p.label} ${p.value.round()}'].join(', '),
      child: AspectRatio(
        aspectRatio: 1,
        child: CustomPaint(
          painter: _DonutPainter(
            parts: parts,
            thickness: thickness,
            track: c.surfaceSoft,
            selected: selected,
          ),
          child: Center(
            child: Padding(
              padding: EdgeInsets.all(thickness + 6),
              child: FittedBox(
                fit: BoxFit.scaleDown,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (centerValue != null)
                      Text(
                        centerValue!,
                        style: TextStyle(
                          fontSize: 22,
                          height: 28 / 22,
                          fontWeight: FontWeight.w600,
                          color: c.ink,
                          fontFeatures: _tabular,
                        ),
                      ),
                    if (centerLabel != null)
                      Text(
                        centerLabel!,
                        style: TextStyle(
                          fontSize: 12,
                          height: 16 / 12,
                          color: c.muted,
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(IterableProperty<ProportionPart>('parts', parts))
      ..add(StringProperty('centerValue', centerValue, defaultValue: null))
      ..add(StringProperty('centerLabel', centerLabel, defaultValue: null))
      ..add(DoubleProperty('thickness', thickness))
      ..add(IntProperty('selected', selected, defaultValue: null))
      ..add(StringProperty('semanticLabel', semanticLabel, defaultValue: null));
  }
}

class _DonutPainter extends CustomPainter {
  _DonutPainter({
    required this.parts,
    required this.thickness,
    required this.track,
    required this.selected,
  });

  final List<ProportionPart> parts;
  final double thickness;
  final Color track;
  final int? selected;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final ring = rect.deflate(thickness / 2);
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = thickness;
    canvas.drawArc(ring, 0, math.pi * 2, false, paint..color = track);
    final total = parts.fold<double>(0, (a, p) => a + math.max(0, p.value));
    if (total <= 0) return;
    // A small gap between parts, in radians at this radius.
    final gap = parts.where((p) => p.value > 0).length > 1
        ? 3 / (ring.width / 2)
        : 0.0;
    var start = -math.pi / 2;
    for (var i = 0; i < parts.length; i++) {
      final v = math.max(0.0, parts[i].value);
      if (v == 0) continue;
      final sweep = v / total * math.pi * 2;
      final faded = selected != null && selected != i;
      paint.color = parts[i].color.withValues(
        alpha: parts[i].color.a * (faded ? 0.35 : 1),
      );
      canvas.drawArc(
        ring,
        start + gap / 2,
        math.max(0.001, sweep - gap),
        false,
        paint,
      );
      start += sweep;
    }
  }

  @override
  bool shouldRepaint(_DonutPainter old) =>
      !listEquals(old.parts, parts) ||
      old.thickness != thickness ||
      old.track != track ||
      old.selected != selected;
}

/// A grid of values shaded from the track colour to [color]: orders by weekday and hour,
/// activity by day. [values] is row-major (`values[row][column]`); columns run in reading
/// order, so the grid mirrors in RTL. A tap reports the cell.
class Heatmap extends StatelessWidget {
  const Heatmap({
    super.key,
    required this.values,
    required this.rowLabels,
    required this.color,
    this.columnLabels = const {},
    this.cellGap = 2,
    this.rowHeight,
    this.onTap,
    this.semanticLabel,
  });

  final List<List<double>> values;
  final List<String> rowLabels;
  final Color color;

  /// Labels under some columns, by column index (e.g. every 6th hour).
  final Map<int, String> columnLabels;
  final double cellGap;

  /// Height of each row; defaults to the cell width, between 8 and 18 px.
  final double? rowHeight;
  final void Function(int row, int column)? onTap;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    final c = ThemeProvider.of(context).colors;
    final label = TextStyle(fontSize: 11, height: 14 / 11, color: c.muted);
    final columns = values.isEmpty ? 0 : values.first.length;
    final max = values
        .expand((r) => r)
        .fold<double>(0, (a, v) => math.max(a, v));
    return Semantics(
      label: semanticLabel,
      child: LayoutBuilder(
        builder: (context, box) {
          // Row labels take their widest width; cells share the rest.
          final painter = TextPainter(textDirection: TextDirection.ltr);
          var labelWidth = 0.0;
          for (final l in rowLabels) {
            painter.text = TextSpan(text: l, style: label);
            painter.layout();
            labelWidth = math.max(labelWidth, painter.width);
          }
          painter.dispose();
          labelWidth += 8;
          final grid = math.max(0.0, box.maxWidth - labelWidth);
          final cell = columns == 0
              ? 0.0
              : (grid - cellGap * (columns - 1)) / columns;
          final rowHeight =
              this.rowHeight ?? math.max(8.0, math.min(cell, 18.0));
          Widget cellAt(int r, int col) {
            final v = values[r][col];
            final t = max <= 0 ? 0.0 : math.pow(v / max, 0.75).toDouble();
            final box = SizedBox(
              width: cell,
              height: rowHeight,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: v <= 0
                      ? c.surfaceSoft
                      : Color.lerp(c.surfaceSoft, color, 0.15 + 0.85 * t),
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
            );
            if (onTap == null) return box;
            return GestureDetector(onTap: () => onTap!(r, col), child: box);
          }

          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            spacing: cellGap,
            children: [
              for (var r = 0; r < values.length; r++)
                Row(
                  children: [
                    SizedBox(
                      width: labelWidth,
                      child: Text(
                        r < rowLabels.length ? rowLabels[r] : '',
                        style: label,
                      ),
                    ),
                    for (var col = 0; col < columns; col++) ...[
                      if (col > 0) SizedBox(width: cellGap),
                      cellAt(r, col),
                    ],
                  ],
                ),
              if (columnLabels.isNotEmpty)
                SizedBox(
                  height: 16,
                  child: Stack(
                    children: [
                      for (final MapEntry(key: col, value: text)
                          in columnLabels.entries)
                        PositionedDirectional(
                          start: labelWidth + col * (cell + cellGap),
                          top: 2,
                          child: Text(text, style: label),
                        ),
                    ],
                  ),
                ),
            ],
          );
        },
      ),
    );
  }

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(IterableProperty<List<double>>('values', values))
      ..add(IterableProperty<String>('rowLabels', rowLabels))
      ..add(ColorProperty('color', color))
      ..add(DiagnosticsProperty<Map<int, String>>('columnLabels', columnLabels))
      ..add(DoubleProperty('cellGap', cellGap))
      ..add(DoubleProperty('rowHeight', rowHeight, defaultValue: null))
      ..add(ObjectFlagProperty<void Function(int, int)>.has('onTap', onTap))
      ..add(StringProperty('semanticLabel', semanticLabel, defaultValue: null));
  }
}
