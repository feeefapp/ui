import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class Variants extends StatelessWidget {
  const Variants({super.key});

  @override
  Widget build(BuildContext context) => const SizedBox(
    width: 360,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 16,
      children: [
        TextField(variant: .outlined, hint: 'Outlined', defaultValue: 'Oran'),
        TextField(
          variant: .filled,
          labelStyle: .inside,
          hint: 'Filled',
          defaultValue: 'Oran',
        ),
        TextField(
          variant: .tonal,
          labelStyle: .inside,
          hint: 'Tonal',
          defaultValue: 'Oran',
        ),
        TextField(variant: .elevated, hint: 'Elevated', defaultValue: 'Oran'),
        TextField(variant: .text, hint: 'Text', defaultValue: 'Oran'),
      ],
    ),
  );
}
