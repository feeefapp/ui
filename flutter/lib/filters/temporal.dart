import 'package:flutter/foundation.dart';

// The pure date and time logic of the temporal fields: the twin of `filters/temporal.ts`,
// `filters/calendar-model.ts` and `filters/temporal-format.ts` in the web kit. Values stay local
// ISO strings (`2026-10-21`, `09:30`, `2026-10-21T09:30`); nothing here converts time zones.

/// What a temporal field or editor picks: a single value or a `from`/`to` range.
enum TemporalType { date, time, datetime, dateRange, timeRange, datetimeRange }

/// The native input a type maps to: `date`, `time` or `datetime-local` (its [html] name).
enum TemporalInput {
  date('date'),
  time('time'),
  datetimeLocal('datetime-local');

  const TemporalInput(this.html);

  /// The HTML input type, as the web kit's `temporalInputType` returns it.
  final String html;
}

/// Which end of a range the calendar is choosing.
enum TemporalEdge { from, to }

/// A temporal value: a [TemporalSingle] local ISO string or a [TemporalRange]. `null` (no value)
/// is the Dart `null`, as in the web kit's `TemporalValue`.
@immutable
sealed class TemporalValue {
  const TemporalValue();

  /// Reads the web kit's JSON shape: a string, `{from, to}`, or null.
  static TemporalValue? fromJson(Object? json) => switch (json) {
    final String text => TemporalSingle(text),
    {'from': final Object? from, 'to': final Object? to} => TemporalRange(
      from: '${from ?? ''}',
      to: '${to ?? ''}',
    ),
    _ => null,
  };

  /// The web kit's JSON shape: the string itself, or `{from, to}`.
  Object toJson();
}

/// One local ISO string: `YYYY-MM-DD`, `HH:mm[:ss]` or `YYYY-MM-DDTHH:mm[:ss]`.
final class TemporalSingle extends TemporalValue {
  const TemporalSingle(this.value);

  /// The ISO text.
  final String value;

  @override
  Object toJson() => value;

  @override
  bool operator ==(Object other) =>
      other is TemporalSingle && other.value == value;

  @override
  int get hashCode => value.hashCode;

  @override
  String toString() => 'TemporalSingle($value)';
}

/// A `{from, to}` range of local ISO strings; either end may be `''` (open).
final class TemporalRange extends TemporalValue {
  const TemporalRange({this.from = '', this.to = ''});

  /// Start, or `''` when open.
  final String from;

  /// End, or `''` when open.
  final String to;

  @override
  Object toJson() => {'from': from, 'to': to};

  @override
  bool operator ==(Object other) =>
      other is TemporalRange && other.from == from && other.to == to;

  @override
  int get hashCode => Object.hash(from, to);

  @override
  String toString() => 'TemporalRange($from, $to)';
}

/// A one-click choice shown beside the calendar.
@immutable
class TemporalPreset {
  const TemporalPreset({required this.label, required this.value});

  /// Button text, also the preset's identity in the picker.
  final String label;

  /// Value applied when the preset is chosen; `null` means "no filter".
  final TemporalValue? value;

  @override
  bool operator ==(Object other) =>
      other is TemporalPreset && other.label == label && other.value == value;

  @override
  int get hashCode => Object.hash(label, value);
}

/// Shared rules for a temporal field or editor.
@immutable
class TemporalConfig {
  const TemporalConfig({
    required this.type,
    this.min,
    this.max,
    this.step,
    this.allowOvernight = false,
    this.presets,
  });

  /// Value shape and picker: date, time, datetime, or one of their `Range` forms.
  final TemporalType type;

  /// Earliest allowed value, in the same ISO format as the value. Earlier days are disabled.
  final String? min;

  /// Latest allowed value, in the same ISO format as the value. Later days are disabled.
  final String? max;

  /// Allowed increment: days for dates, seconds for times and datetimes, counted from [min].
  final num? step;

  /// Time ranges only: lets the end time be earlier than the start (crossing midnight).
  final bool allowOvernight;

  /// Quick choices; defaults to `temporalPresets(type)`. Presets that break the rules are hidden.
  final List<TemporalPreset>? presets;
}

/// True when [type] names a temporal type (`date`, `timeRange`, …).
bool isTemporalType(String? type) =>
    type != null && TemporalType.values.any((t) => t.name == type);

/// True for the `…Range` types.
bool isTemporalRange(TemporalType type) => type.name.endsWith('Range');

/// The native input of a type: datetimes, times or dates.
TemporalInput temporalInputType(TemporalType type) =>
    type.name.startsWith('datetime')
    ? TemporalInput.datetimeLocal
    : type.name.startsWith('time')
    ? TemporalInput.time
    : TemporalInput.date;

/// Turns empty values (`''`, `{from: '', to: ''}`) into `null`.
TemporalValue? normalizeTemporal(TemporalValue? value) => switch (value) {
  TemporalRange(from: '', to: '') => null,
  TemporalSingle(value: '') => null,
  _ => value,
};

/// JavaScript `Number(text)`: empty → 0, unparsable → NaN.
double _jsNumber(String text) {
  final trimmed = text.trim();
  if (trimmed.isEmpty) return 0;
  return double.tryParse(trimmed) ?? double.nan;
}

/// A number as JavaScript prints it (`900`, not `900.0`).
String jsNumberText(num value) =>
    value is int || value == value.truncateToDouble() && value.isFinite
    ? value.toInt().toString()
    : value.toString();

final _timePattern = RegExp(r'^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$');
final _datePattern = RegExp(
  r'^(\d{4})-(\d{2})-(\d{2})(?:T([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?)?$',
);
final _clockPattern = RegExp(r'^\d{2}:\d{2}$');

/// Days in [month] (1-12) of [year], proleptic Gregorian like JavaScript dates.
int daysInMonth(int year, int month) => DateTime.utc(year, month + 1, 0).day;

/// Milliseconds since the epoch of an ISO date or date-time read as UTC (`Date.parse(…Z)`), or
/// NaN when it is not one.
double _utcMillis(String text) {
  final match = RegExp(
    r'^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$',
  ).firstMatch(text);
  if (match == null) return double.nan;
  int at(int i) => int.parse(match.group(i) ?? '0');
  if (at(2) < 1 || at(2) > 12 || at(3) < 1 || at(3) > 31 || at(4) > 24) {
    return double.nan;
  }
  return DateTime.utc(
    at(1),
    at(2),
    at(3),
    at(4),
    at(5),
    at(6),
  ).millisecondsSinceEpoch.toDouble();
}

/// Checks a value against a config: ISO format and real calendar dates, `step`, `min`/`max`, and
/// range order. Returns an English error message, or `null` when the value (or `null`) is valid.
String? validateTemporal(TemporalConfig config, TemporalValue? value) {
  if (value == null) return null;
  final parts = switch (value) {
    TemporalSingle(:final value) => [value],
    TemporalRange(:final from, :final to) => [
      from,
      to,
    ].where((p) => p.isNotEmpty),
  }.toList();
  final input = temporalInputType(config.type);
  bool valid(String part) {
    if (input == TemporalInput.time) return _timePattern.hasMatch(part);
    final match = _datePattern.firstMatch(part);
    if (match == null ||
        (input == TemporalInput.datetimeLocal) != part.contains('T')) {
      return false;
    }
    final year = int.parse(match.group(1)!);
    final month = int.parse(match.group(2)!);
    final day = int.parse(match.group(3)!);
    return month >= 1 &&
        month <= 12 &&
        day >= 1 &&
        day <= daysInMonth(year, month);
  }

  if (parts.any((part) => !valid(part))) return 'Enter a valid date or time.';
  final step = config.step;
  if (step != null && step > 0) {
    double units(String part) {
      if (input == TemporalInput.time) {
        const scale = [3600, 60, 1];
        final pieces = part.split(':');
        var total = 0.0;
        for (var i = 0; i < pieces.length; i++) {
          // JavaScript multiplies by `undefined` past the third piece: NaN.
          total += _jsNumber(pieces[i]) * (i < 3 ? scale[i] : double.nan);
        }
        return total;
      }
      return input == TemporalInput.date
          ? _utcMillis('${part}T00:00:00') / 86400000
          : _utcMillis(part) / 1000;
    }

    final base = config.min != null && config.min!.isNotEmpty
        ? units(config.min!)
        : 0.0;
    if (parts.any((part) {
      final steps = (units(part) - base) / step;
      return (steps - _jsRound(steps)).abs() > 1e-7;
    })) {
      return input == TemporalInput.date
          ? 'Choose a date in ${jsNumberText(step)}-day steps.'
          : 'Choose a time in ${jsNumberText(step)}-second steps.';
    }
  }
  String comparable(String part) =>
      input != TemporalInput.date &&
          _clockPattern.hasMatch(part.split('T').last)
      ? '$part:00'
      : part;
  final min = config.min, max = config.max;
  if (min != null &&
      min.isNotEmpty &&
      parts.any((part) => comparable(part).compareTo(comparable(min)) < 0)) {
    return 'Use a value on or after $min.';
  }
  if (max != null &&
      max.isNotEmpty &&
      parts.any((part) => comparable(part).compareTo(comparable(max)) > 0)) {
    return 'Use a value on or before $max.';
  }
  if (value is TemporalRange &&
      value.from.isNotEmpty &&
      value.to.isNotEmpty &&
      comparable(value.from).compareTo(comparable(value.to)) > 0 &&
      !(config.type == TemporalType.timeRange && config.allowOvernight)) {
    return config.type == TemporalType.timeRange
        ? 'The end time must be on or after the start time.'
        : 'The end must be on or after the start.';
  }
  return null;
}

/// `Math.round`: halves go up, toward +∞.
double _jsRound(double value) =>
    value.isFinite ? (value + 0.5).floorToDouble() : value;

String _pad(int n) => n.toString().padLeft(2, '0');
String _dateText(DateTime d) => '${d.year}-${_pad(d.month)}-${_pad(d.day)}';
String _datetimeText(DateTime d) =>
    '${_dateText(d)}T${_pad(d.hour)}:${_pad(d.minute)}';

/// [now] with its wall-clock fields shifted (local or UTC, like [now]).
DateTime _wall(DateTime now, {int days = 0, int hours = 0}) {
  final make = now.isUtc ? DateTime.utc : DateTime.new;
  return make(
    now.year,
    now.month,
    now.day + days,
    now.hour + hours,
    now.minute,
    now.second,
  );
}

/// Default presets for a type, computed from [now] in its wall-clock time (Today, Last 7 days,
/// Morning…). Feature owners choose time zone and query conversion.
List<TemporalPreset> temporalPresets(TemporalType type, [DateTime? now]) {
  final at = now ?? DateTime.now();
  final today = _dateText(at);
  final yesterday = _wall(at, days: -1);
  TemporalPreset preset(String label, TemporalValue? value) =>
      TemporalPreset(label: label, value: value);
  switch (type) {
    case TemporalType.date:
      return [
        preset('Today', TemporalSingle(today)),
        preset('Yesterday', TemporalSingle(_dateText(yesterday))),
      ];
    case TemporalType.time:
      return [
        preset('Now', TemporalSingle('${_pad(at.hour)}:${_pad(at.minute)}')),
        preset('09:00', const TemporalSingle('09:00')),
        preset('17:00', const TemporalSingle('17:00')),
      ];
    case TemporalType.datetime:
      return [
        preset('Now', TemporalSingle(_datetimeText(at))),
        preset(
          'Tomorrow at 09:00',
          TemporalSingle('${_dateText(_wall(at, days: 1))}T09:00'),
        ),
      ];
    case TemporalType.timeRange:
      return [
        preset('Morning', const TemporalRange(from: '09:00', to: '12:00')),
        preset('Afternoon', const TemporalRange(from: '13:00', to: '17:00')),
      ];
    case TemporalType.datetimeRange:
      final past = _wall(at, hours: -24);
      return [
        preset(
          'Last 24 hours',
          TemporalRange(from: _datetimeText(past), to: _datetimeText(at)),
        ),
        preset(
          'Today',
          TemporalRange(from: '${today}T00:00', to: '${today}T23:59'),
        ),
      ];
    case TemporalType.dateRange:
      TemporalRange lastDays(int count) => TemporalRange(
        from: _dateText(_wall(at, days: -count + 1)),
        to: today,
      );
      final make = at.isUtc ? DateTime.utc : DateTime.new;
      final lastMonthStart = make(at.year, at.month - 1, 1);
      final lastMonthEnd = make(at.year, at.month, 0);
      return [
        preset('All time', null),
        preset('Today', TemporalRange(from: today, to: today)),
        preset(
          'Yesterday',
          TemporalRange(from: _dateText(yesterday), to: _dateText(yesterday)),
        ),
        preset('Last 7 days', lastDays(7)),
        preset('Last 14 days', lastDays(14)),
        preset('Last 30 days', lastDays(30)),
        preset(
          'This month',
          TemporalRange(from: '${today.substring(0, 7)}-01', to: today),
        ),
        preset(
          'Last month',
          TemporalRange(
            from: _dateText(lastMonthStart),
            to: _dateText(lastMonthEnd),
          ),
        ),
      ];
  }
}

/// Reads an editor's value from form-like [data]: `date`, or `from`/`to` for ranges.
TemporalValue? readTemporalForm(TemporalType type, Map<String, String?> data) =>
    normalizeTemporal(
      isTemporalRange(type)
          ? TemporalRange(from: data['from'] ?? '', to: data['to'] ?? '')
          : TemporalSingle(data['date'] ?? ''),
    );

// Calendar model (`calendar-model.ts`).

/// `YYYY-MM-DD` of a date's wall-clock day.
String calendarDate(DateTime date) =>
    '${date.year.toString().padLeft(4, '0')}-${_pad(date.month)}-${_pad(date.day)}';

/// The local noon of an ISO date (only the first ten characters are read). Out-of-range days
/// roll over, like JavaScript dates.
DateTime parseCalendarDate(String value) {
  final pieces = (value.length > 10 ? value.substring(0, 10) : value).split(
    '-',
  );
  int at(int i) => i < pieces.length ? int.tryParse(pieces[i]) ?? 0 : 0;
  return DateTime(at(0), at(1), at(2), 12);
}

/// A Monday-first six-week grid (42 cells) for [month] (0-based, as in the web kit) of [year]:
/// `YYYY-MM-DD` for the month's days, `null` for the padding cells.
List<String?> monthDays(int year, int month) {
  final first = DateTime(year, month + 1, 1, 12);
  final offset = (first.weekday - 1) % 7;
  final count = DateTime(year, month + 2, 0).day;
  return List.generate(42, (index) {
    final day = index - offset + 1;
    return day < 1 || day > count
        ? null
        : calendarDate(DateTime(year, month + 1, day, 12));
  });
}

/// One click of a range calendar: the first picks the start, the second the end; an end before
/// the start restarts the selection there.
({TemporalRange value, TemporalEdge edge}) chooseRangeDate(
  TemporalRange current,
  String day,
  TemporalEdge edge,
) {
  if (edge == TemporalEdge.from ||
      current.from.isEmpty ||
      day.compareTo(current.from) < 0) {
    return (value: TemporalRange(from: day), edge: TemporalEdge.to);
  }
  return (
    value: TemporalRange(from: current.from, to: day),
    edge: TemporalEdge.from,
  );
}

/// The month `YYYY-MM` that is [delta] months from [month].
String shiftMonth(String month, int delta) {
  final date = parseCalendarDate('$month-01');
  return calendarDate(DateTime(date.year, date.month + delta, 1, 12))
      .substring(0, 7);
}

// Locale names (`Intl.DateTimeFormat` for en, fr and ar; others fall back to en).

/// Month, weekday and date names for one locale: the parts of `Intl.DateTimeFormat` the temporal
/// widgets use, for English, French and Arabic (other locales read as English). Digits are Latin
/// in every locale, as browsers format `ar`.
@immutable
class TemporalLocale {
  const TemporalLocale._(
    this.code,
    this._monthsLong,
    this._monthsShort,
    this._weekdaysLong,
    this._weekdaysNarrow,
  );

  /// The locale for [locale] (`en-US`, `fr`, `ar-DZ`…), by its language.
  factory TemporalLocale.of(String? locale) =>
      switch ((locale ?? 'en').split(RegExp('[-_]')).first.toLowerCase()) {
        'fr' => _fr,
        'ar' => _ar,
        _ => _en,
      };

  /// Language code: `en`, `fr` or `ar`.
  final String code;
  final List<String> _monthsLong, _monthsShort, _weekdaysLong, _weekdaysNarrow;

  /// Full month name; [month] is 1-12.
  String monthLong(int month) => _monthsLong[month - 1];

  /// Short month name (`Oct`, `oct.`, `أكتوبر`); [month] is 1-12.
  String monthShort(int month) => _monthsShort[month - 1];

  /// Full weekday name; [weekday] is 1 (Monday) to 7 (Sunday), as `DateTime.weekday`.
  String weekdayLong(int weekday) => _weekdaysLong[weekday - 1];

  /// One-letter weekday; [weekday] is 1 (Monday) to 7 (Sunday).
  String weekdayNarrow(int weekday) => _weekdaysNarrow[weekday - 1];

  /// An integer as `Intl.NumberFormat` prints it.
  String number(int value) => value.toString();

  /// `{month: 'long', year: 'numeric'}`: `October 2026`.
  String monthYear(int year, int month) => '${monthLong(month)} $year';

  /// `{year: 'numeric', month: 'short', day: 'numeric'}`: `Oct 19, 2026`.
  String dateMedium(DateTime date) => code == 'en'
      ? '${monthShort(date.month)} ${date.day}, ${date.year}'
      : '${date.day} ${monthShort(date.month)} ${date.year}';

  /// `{month: 'short', day: 'numeric'}`: `Oct 19`.
  String monthDay(DateTime date) => code == 'en'
      ? '${monthShort(date.month)} ${date.day}'
      : '${date.day} ${monthShort(date.month)}';

  /// `{dateStyle: 'full'}`: `Monday, October 19, 2026`.
  String dateFull(DateTime date) => switch (code) {
    'fr' =>
      '${weekdayLong(date.weekday)} ${date.day} ${monthLong(date.month)} ${date.year}',
    'ar' =>
      '${weekdayLong(date.weekday)}، ${date.day} ${monthLong(date.month)} ${date.year}',
    _ =>
      '${weekdayLong(date.weekday)}, ${monthLong(date.month)} ${date.day}, ${date.year}',
  };

  static const _en = TemporalLocale._(
    'en',
    [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ],
    [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ],
    [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ],
    ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
  );
  static const _fr = TemporalLocale._(
    'fr',
    [
      'janvier',
      'février',
      'mars',
      'avril',
      'mai',
      'juin',
      'juillet',
      'août',
      'septembre',
      'octobre',
      'novembre',
      'décembre',
    ],
    [
      'janv.',
      'févr.',
      'mars',
      'avr.',
      'mai',
      'juin',
      'juil.',
      'août',
      'sept.',
      'oct.',
      'nov.',
      'déc.',
    ],
    ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'],
    ['L', 'M', 'M', 'J', 'V', 'S', 'D'],
  );
  static const _ar = TemporalLocale._(
    'ar',
    [
      'يناير',
      'فبراير',
      'مارس',
      'أبريل',
      'مايو',
      'يونيو',
      'يوليو',
      'أغسطس',
      'سبتمبر',
      'أكتوبر',
      'نوفمبر',
      'ديسمبر',
    ],
    [
      'يناير',
      'فبراير',
      'مارس',
      'أبريل',
      'مايو',
      'يونيو',
      'يوليو',
      'أغسطس',
      'سبتمبر',
      'أكتوبر',
      'نوفمبر',
      'ديسمبر',
    ],
    ['الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد'],
    ['ن', 'ث', 'ر', 'خ', 'ج', 'س', 'ح'],
  );
}

/// Display text of a value (`Oct 19, 2026`, `Any – Oct 19, 2026`); `''` when empty. Invalid
/// parts show as typed. Display only: canonical values stay local ISO strings.
String formatTemporalValue(
  TemporalType type,
  TemporalValue? value, [
  String? locale,
]) {
  if (value == null || normalizeTemporal(value) == null) return '';
  final input = temporalInputType(type);
  final names = TemporalLocale.of(locale);
  final single = TemporalType.values.byName(type.name.replaceAll('Range', ''));
  String part(String text) {
    if (text.isEmpty) return 'Any';
    if (validateTemporal(TemporalConfig(type: single), TemporalSingle(text)) !=
        null) {
      return text;
    }
    if (input == TemporalInput.time) return text;
    final date = names.dateMedium(parseCalendarDate(text));
    return input == TemporalInput.datetimeLocal
        ? '$date, ${text.split('T')[1]}'
        : date;
  }

  return switch (value) {
    TemporalSingle(:final value) => part(value),
    TemporalRange(:final from, :final to) => '${part(from)} – ${part(to)}',
  };
}
