import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

const _variants = [
  (ControlVariant.outlined, 'Outlined'),
  (ControlVariant.filled, 'Filled'),
  (ControlVariant.tonal, 'Tonal'),
  (ControlVariant.elevated, 'Elevated'),
  (ControlVariant.text, 'Text'),
];

class Variants extends StatefulWidget {
  const Variants({super.key});

  @override
  State<Variants> createState() => _VariantsState();
}

class _VariantsState extends State<Variants> {
  final _values = <String, String?>{};

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 360,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 16,
      children: [
        for (final (variant, hint) in _variants)
          DateField(
            hint: hint,
            variant: variant,
            controlSize: .small,
            value: _values[hint],
            onValueChange: (next) => setState(() => _values[hint] = next),
          ),
        DateField(
          hint: 'Inside label',
          labelStyle: .inside,
          value: _values['inside'],
          onValueChange: (next) => setState(() => _values['inside'] = next),
        ),
      ],
    ),
  );
}
