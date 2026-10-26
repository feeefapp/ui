import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

const _variants = [
  ControlVariant.elevated,
  ControlVariant.outlined,
  ControlVariant.filled,
  ControlVariant.tonal,
  ControlVariant.text,
];

class Variants extends StatefulWidget {
  const Variants({super.key});

  @override
  State<Variants> createState() => _VariantsState();
}

class _VariantsState extends State<Variants> {
  String currency = 'DZD';

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 360,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 16,
      children: [
        for (final variant in _variants)
          Select(
            key: ValueKey(variant),
            variant: variant,
            labelStyle: variant == .filled || variant == .tonal
                ? .inside
                : .outlined,
            hint: 'Currency (${variant.name})',
            value: currency,
            onValueChange: (value) => setState(() => currency = value),
            children: const [
              Option(value: 'DZD', child: Text('Algerian dinar (DZD)')),
              Option(value: 'EUR', child: Text('Euro (EUR)')),
              Option(value: 'USD', child: Text('US dollar (USD)')),
            ],
          ),
      ],
    ),
  );
}
