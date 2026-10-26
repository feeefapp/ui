import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class Price extends StatefulWidget {
  const Price({super.key});

  @override
  State<Price> createState() => _PriceState();
}

class _PriceState extends State<Price> {
  double price = 2500;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 360,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 16,
      children: [
        NumberField(
          label: 'Price',
          unit: 'DA',
          step: 50,
          min: 0,
          value: price,
          onValueChange: (value) => setState(() => price = value),
        ),
        // `<small>`: 12.5px text.
        const Text(
          'Drag sideways, or click and type 2500*0.9 to take 10% off.',
          style: TextStyle(fontSize: 12.5),
        ),
      ],
    ),
  );
}
