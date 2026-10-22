import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart' hide RadioGroup;

class Basic extends StatefulWidget {
  const Basic({super.key});

  @override
  State<Basic> createState() => _BasicState();
}

class _BasicState extends State<Basic> {
  String payment = 'cod';

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 360,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 16,
      children: [
        RadioGroup(
          label: 'Payment method',
          value: payment,
          onValueChange: (value) => setState(() => payment = value),
          options: const [
            RadioOption(value: 'cod', label: Text('Cash on delivery')),
            RadioOption(value: 'edahabia', label: Text('Edahabia card')),
            RadioOption(value: 'cib', label: Text('CIB card')),
          ],
        ),
        // The paragraph, with the value in the browser's monospace `<code>`.
        Text.rich(
          TextSpan(
            children: [
              const TextSpan(text: 'Selected: '),
              TextSpan(
                text: payment,
                style: const TextStyle(
                  fontFamily: 'monospace',
                  fontSize: 15 * 13 / 16,
                ),
              ),
            ],
          ),
        ),
      ],
    ),
  );
}
