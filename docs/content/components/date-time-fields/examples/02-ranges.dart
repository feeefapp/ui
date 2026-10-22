import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class Ranges extends StatefulWidget {
  const Ranges({super.key});

  @override
  State<Ranges> createState() => _RangesState();
}

class _RangesState extends State<Ranges> {
  TemporalRange? _period;
  TemporalRange? _hours = const TemporalRange(from: '09:00', to: '17:00');
  TemporalRange? _promo;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 360,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 16,
      children: [
        DateRangeField(
          hint: 'Reporting period',
          value: _period,
          onValueChange: (value) => setState(() => _period = value),
          clearable: true,
        ),
        TimeRangeField(
          hint: 'Delivery hours',
          value: _hours,
          onValueChange: (value) => setState(() => _hours = value),
        ),
        DateTimeRangeField(
          hint: 'Flash sale window',
          value: _promo,
          onValueChange: (value) => setState(() => _promo = value),
          supportingText: const Text(
            'Leave the end open to run the sale until you stop it.',
          ),
        ),
      ],
    ),
  );
}
