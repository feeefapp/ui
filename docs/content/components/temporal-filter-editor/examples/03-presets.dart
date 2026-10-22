import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

final _today = DateTime.now();
String _daysAgo(int count) =>
    calendarDate(DateTime(_today.year, _today.month, _today.day - count));

final _config = TemporalConfig(
  type: TemporalType.dateRange,
  // Delivered orders are only kept for 90 days, so older presets are hidden automatically.
  min: _daysAgo(89),
  max: calendarDate(_today),
  presets: [
    ...temporalPresets(
      TemporalType.dateRange,
      _today,
    ).where((preset) => preset.value != null),
    TemporalPreset(
      label: 'Last 90 days',
      value: TemporalRange(from: _daysAgo(89), to: calendarDate(_today)),
    ),
    TemporalPreset(
      label: 'Last 180 days',
      value: TemporalRange(from: _daysAgo(179), to: calendarDate(_today)),
    ),
  ],
);

class Presets extends StatefulWidget {
  const Presets({super.key});

  @override
  State<Presets> createState() => _PresetsState();
}

class _PresetsState extends State<Presets> {
  TemporalValue? _value;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 560,
    child: TemporalFilterEditor(
      config: _config,
      value: _value,
      onChange: (next) => setState(() => _value = next),
    ),
  );
}
