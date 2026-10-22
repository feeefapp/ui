import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class Stops extends StatelessWidget {
  const Stops({super.key});

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 560,
    child: Slider(
      label: 'Minimum rating',
      min: 1,
      max: 5,
      defaultValue: 4,
      showStops: true,
      getValueText: (value) => '${value.round()} stars and up',
    ),
  );
}
