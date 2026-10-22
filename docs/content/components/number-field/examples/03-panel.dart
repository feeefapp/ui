import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class ParcelPanel extends StatefulWidget {
  const ParcelPanel({super.key});

  @override
  State<ParcelPanel> createState() => _ParcelPanelState();
}

class _ParcelPanelState extends State<ParcelPanel> {
  final size = <String, double>{
    'length': 30,
    'width': 20,
    'height': 15,
    'weight': 1.2,
  };

  ValueChanged<double> update(String key) =>
      (value) => setState(() => size[key] = value);

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 360,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 6,
      children: [
        NumberField(
          label: 'Length',
          unit: 'cm',
          controlSize: .compact,
          min: 1,
          max: 120,
          value: size['length'],
          onValueChange: update('length'),
        ),
        NumberField(
          label: 'Width',
          unit: 'cm',
          controlSize: .compact,
          min: 1,
          max: 120,
          value: size['width'],
          onValueChange: update('width'),
        ),
        NumberField(
          label: 'Height',
          unit: 'cm',
          controlSize: .compact,
          min: 1,
          max: 120,
          value: size['height'],
          onValueChange: update('height'),
        ),
        NumberField(
          label: 'Weight',
          unit: 'kg',
          controlSize: .compact,
          min: 0,
          step: 0.1,
          value: size['weight'],
          onValueChange: update('weight'),
        ),
      ],
    ),
  );
}
