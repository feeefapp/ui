import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class Basic extends StatefulWidget {
  const Basic({super.key});

  @override
  State<Basic> createState() => _BasicState();
}

class _BasicState extends State<Basic> {
  double discount = 15;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 560,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 8,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text('Discount'),
            Semantics(liveRegion: true, child: Text('${discount.round()}%')),
          ],
        ),
        Slider(
          label: 'Discount',
          max: 50,
          step: 5,
          value: discount,
          onValueChange: (value) => setState(() => discount = value),
          getValueText: (value) => '${value.round()}%',
        ),
      ],
    ),
  );
}
