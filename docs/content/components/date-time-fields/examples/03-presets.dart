import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

List<TemporalPreset> _salesPresets([DateTime? at]) {
  final now = at ?? DateTime.now();
  // The Algerian work week starts on Sunday.
  final weekStart = DateTime(now.year, now.month, now.day - now.weekday % 7);
  return [
    ...temporalPresets(TemporalType.dateRange, now).where(
      (preset) =>
          ['Today', 'Last 7 days', 'Last 30 days'].contains(preset.label),
    ),
    TemporalPreset(
      label: 'This week',
      value: TemporalRange(
        from: calendarDate(weekStart),
        to: calendarDate(now),
      ),
    ),
    const TemporalPreset(
      label: 'Ramadan 2026',
      value: TemporalRange(from: '2026-02-18', to: '2026-03-19'),
    ),
  ];
}

class Presets extends StatefulWidget {
  const Presets({super.key});

  @override
  State<Presets> createState() => _PresetsState();
}

class _PresetsState extends State<Presets> {
  TemporalRange? _period;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 360,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 16,
      children: [
        DateRangeField(
          hint: 'Sales period',
          value: _period,
          onValueChange: (value) => setState(() => _period = value),
          presets: _salesPresets(),
        ),
      ],
    ),
  );
}
