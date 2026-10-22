import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class Overnight extends StatefulWidget {
  const Overnight({super.key});

  @override
  State<Overnight> createState() => _OvernightState();
}

class _OvernightState extends State<Overnight> {
  TemporalRange? _shift = const TemporalRange(from: '20:00', to: '02:00');

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 360,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 16,
      children: [
        TimeRangeField(
          hint: 'Night confirmation shift',
          value: _shift,
          onValueChange: (value) => setState(() => _shift = value),
          allowOvernight: true,
          supportingText: const Text('Ends the next morning.'),
        ),
      ],
    ),
  );
}
