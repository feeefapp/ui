import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class Bounds extends StatefulWidget {
  const Bounds({super.key});

  @override
  State<Bounds> createState() => _BoundsState();
}

class _BoundsState extends State<Bounds> {
  String? _date;
  String? _slot = '10:00';

  @override
  Widget build(BuildContext context) {
    final today = DateTime.now();
    final lastDay = DateTime(today.year, today.month, today.day + 14);
    return SizedBox(
      width: 360,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 16,
        children: [
          DateField(
            hint: 'Delivery date',
            value: _date,
            onValueChange: (value) => setState(() => _date = value),
            min: calendarDate(today),
            max: calendarDate(lastDay),
            supportingText: const Text('Within the next two weeks.'),
          ),
          TimeField(
            hint: 'Delivery slot',
            value: _slot,
            onValueChange: (value) => setState(() => _slot = value),
            min: '08:00',
            max: '18:00',
            step: 30 * 60,
            supportingText: const Text(
              'Half-hour slots between 08:00 and 18:00.',
            ),
          ),
        ],
      ),
    );
  }
}
