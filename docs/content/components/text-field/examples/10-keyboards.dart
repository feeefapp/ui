import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

class Keyboards extends StatelessWidget {
  const Keyboards({super.key});

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 360,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 16,
      children: [
        const TextField(
          hint: 'Phone',
          keyboardType: TextInputType.phone,
          autofillHints: [AutofillHints.telephoneNumber],
          leading: Text('+213'),
        ),
        TextField(
          hint: 'Postal code',
          keyboardType: TextInputType.number,
          // Digits only as they are typed, where the web field checks `pattern` on submit.
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          maxLength: 5,
          supportingText: const Text('Five digits, like 16000.'),
        ),
        const TextField(
          hint: 'Customer name',
          textCapitalization: TextCapitalization.words,
          autofillHints: [AutofillHints.name],
        ),
      ],
    ),
  );
}
