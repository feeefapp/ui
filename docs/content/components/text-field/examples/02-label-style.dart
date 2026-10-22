import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class LabelStyle extends StatelessWidget {
  const LabelStyle({super.key});

  @override
  Widget build(BuildContext context) => const SizedBox(
    width: 360,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 16,
      children: [
        TextField(
          hint: 'Store name',
          labelStyle: .outlined,
          defaultValue: 'Dar El Beida Shop',
        ),
        TextField(
          hint: 'Store name',
          labelStyle: .inside,
          variant: .tonal,
          defaultValue: 'Dar El Beida Shop',
        ),
      ],
    ),
  );
}
