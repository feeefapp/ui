import 'dart:convert';
import 'dart:io';

import 'package:feeef_ui/filters/temporal.dart';
import 'package:flutter_test/flutter_test.dart';

/// Vectors from the web kit (flutter/tool/generate_temporal_fixture.ts, time zone pinned to UTC).
void main() {
  final f = jsonDecode(
    File('test/fixtures/temporal.json').readAsStringSync(),
  ) as Map<String, dynamic>;
  TemporalType type(Object? name) => TemporalType.values.byName(name as String);
  TemporalConfig config(Map<String, dynamic> j) => TemporalConfig(
    type: type(j['type']),
    min: j['min'] as String?,
    max: j['max'] as String?,
    step: j['step'] as num?,
    allowOvernight: j['allowOvernight'] == true,
  );
  Object? json(TemporalValue? value) => value?.toJson();

  test('type helpers match', () {
    for (final t in f['isType'] as List) {
      expect(isTemporalType(t[0] as String), t[1], reason: '${t[0]}');
    }
    for (final t in f['types'] as List) {
      expect(isTemporalRange(type(t['type'])), t['range']);
      expect(temporalInputType(type(t['type'])).html, t['input']);
    }
  });

  test('normalizeTemporal matches', () {
    for (final n in f['normalize'] as List) {
      expect(json(normalizeTemporal(TemporalValue.fromJson(n[0]))), n[1]);
    }
  });

  test('validateTemporal matches every vector', () {
    for (final v in f['validate'] as List) {
      expect(
        validateTemporal(
          config(v['config'] as Map<String, dynamic>),
          TemporalValue.fromJson(v['value']),
        ),
        v['error'],
        reason: '${v['config']} ${v['value']}',
      );
    }
  });

  test('temporalPresets match at every reference time', () {
    for (final p in f['presets'] as List) {
      final now = DateTime.parse(p['now'] as String);
      final presets = temporalPresets(type(p['type']), now);
      expect(
        [
          for (final preset in presets)
            {'label': preset.label, 'value': json(preset.value)},
        ],
        p['presets'],
        reason: '${p['type']} at ${p['now']}',
      );
      // Every default preset is valid for its own type.
      for (final preset in presets) {
        expect(
          validateTemporal(TemporalConfig(type: type(p['type'])), preset.value),
          isNull,
        );
      }
    }
  });

  test('readTemporalForm matches', () {
    for (final r in f['forms'] as List) {
      final data = (r['data'] as Map).cast<String, String?>();
      expect(json(readTemporalForm(type(r['type']), data)), r['value']);
    }
  });

  test('calendar model: dates, six-week grids and range clicks', () {
    for (final c in f['calendarDate'] as List) {
      expect(calendarDate(parseCalendarDate(c[0] as String)), c[1]);
    }
    for (final m in f['monthDays'] as List) {
      expect(
        monthDays(m['year'] as int, m['month'] as int),
        m['days'],
        reason: '${m['year']}-${m['month']}',
      );
    }
    for (final c in f['chooseRange'] as List) {
      final current = TemporalValue.fromJson(c['current']) as TemporalRange;
      final result = chooseRangeDate(
        current,
        c['day'] as String,
        TemporalEdge.values.byName(c['edge'] as String),
      );
      expect(result.value.toJson(), c['result']['value']);
      expect(result.edge.name, c['result']['edge']);
    }
    expect(shiftMonth('2026-12', 1), '2027-01');
    expect(shiftMonth('2026-01', -1), '2025-12');
  });

  test('formatTemporalValue matches Intl for en, fr and ar', () {
    for (final x in f['format'] as List) {
      expect(
        formatTemporalValue(
          type(x['type']),
          TemporalValue.fromJson(x['value']),
          x['locale'] as String,
        ),
        x['text'],
        reason: '${x['locale']} ${x['type']} ${x['value']}',
      );
    }
  });

  test('locale names match Intl', () {
    final names = f['names'] as Map<String, dynamic>;
    for (final MapEntry(key: code, value: n) in names.entries) {
      final l = TemporalLocale.of(code);
      expect([for (var m = 1; m <= 12; m++) l.monthLong(m)], n['monthsLong']);
      expect([for (var m = 1; m <= 12; m++) l.monthShort(m)], n['monthsShort']);
      expect([
        for (var d = 1; d <= 7; d++) l.weekdayLong(d),
      ], n['weekdaysLong']);
      expect([
        for (var d = 1; d <= 7; d++) l.weekdayNarrow(d),
      ], n['weekdaysNarrow']);
      for (final d in n['dates'] as List) {
        final date = parseCalendarDate(d['day'] as String);
        expect(l.monthYear(date.year, date.month), d['monthYear']);
        expect(l.dateMedium(date), d['medium']);
        expect(l.monthDay(date), d['monthDay']);
        expect(l.dateFull(date), d['full']);
        expect(l.number(date.day), d['number']);
      }
    }
  });
}
