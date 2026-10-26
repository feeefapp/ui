import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class Percent extends StatefulWidget {
  const Percent({super.key});

  @override
  State<Percent> createState() => _PercentState();
}

class _PercentState extends State<Percent> {
  double discount = 15;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 360,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 16,
      children: [
        NumberField(
          label: 'Discount',
          unit: '%',
          min: 0,
          max: 100,
          value: discount,
          onValueChange: (value) => setState(() => discount = value),
        ),
      ],
    ),
  );
}
