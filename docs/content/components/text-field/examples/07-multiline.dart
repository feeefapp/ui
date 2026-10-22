import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class Multiline extends StatelessWidget {
  const Multiline({super.key});

  @override
  Widget build(BuildContext context) => const SizedBox(
    width: 360,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 16,
      children: [
        TextField(
          hint: 'Delivery note',
          multiline: true,
          minLines: 3,
          maxLines: 6,
          maxLength: 280,
          showCounter: true,
          supportingText: Text('Printed on the shipping label.'),
        ),
      ],
    ),
  );
}
