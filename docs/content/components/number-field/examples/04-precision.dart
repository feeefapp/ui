import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class Precision extends StatefulWidget {
  const Precision({super.key});

  @override
  State<Precision> createState() => _PrecisionState();
}

class _PrecisionState extends State<Precision> {
  double rating = 4.2;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 360,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 16,
      children: [
        NumberField(
          label: 'Minimum courier rating',
          min: 0,
          max: 5,
          step: 0.1,
          value: rating,
          onValueChange: (value) => setState(() => rating = value),
          format: (value) => '${value.toStringAsFixed(1)} ★',
        ),
        // `<small>`: 12.5px text.
        const Text(
          'Hold Shift while dragging to scrub ten times slower.',
          style: TextStyle(fontSize: 12.5),
        ),
      ],
    ),
  );
}
