import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

const _levels = ['Draft', 'Standard', 'High', 'Best'];

class Marks extends StatefulWidget {
  const Marks({super.key});

  @override
  State<Marks> createState() => _MarksState();
}

class _MarksState extends State<Marks> {
  double quality = 1;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 560,
    child: Slider(
      label: 'Image quality',
      min: 0,
      max: 3,
      value: quality,
      onValueChange: (value) => setState(() => quality = value),
      marks: [
        for (var i = 0; i < _levels.length; i++)
          SliderMark(value: i.toDouble(), label: Text(_levels[i])),
      ],
      getValueText: (value) => _levels[value.round()],
    ),
  );
}
