import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class Basic extends StatelessWidget {
  const Basic({super.key});

  @override
  Widget build(BuildContext context) => const SizedBox(
    width: 360,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 16,
      children: [
        TextField(hint: 'Customer name', autofillHints: [AutofillHints.name]),
        TextField(
          hint: 'Phone number',
          keyboardType: TextInputType.phone,
          autofillHints: [AutofillHints.telephoneNumber],
          supportingText: Text('10 digits, starting with 05, 06 or 07.'),
        ),
        TextField(
          hint: 'Address',
          defaultValue: '12 rue Didouche Mourad, Alger',
        ),
      ],
    ),
  );
}
