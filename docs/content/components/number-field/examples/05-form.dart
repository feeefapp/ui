import 'dart:convert';

import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class InAForm extends StatefulWidget {
  const InAForm({super.key});

  @override
  State<InAForm> createState() => _InAFormState();
}

class _InAFormState extends State<InAForm> {
  String? sent;

  @override
  Widget build(BuildContext context) => FieldForm(
    onSubmit: (data) => setState(() => sent = jsonEncode(data)),
    child: SizedBox(
      width: 360,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 16,
        children: [
          const NumberField(
            label: 'Quantity',
            name: 'quantity',
            min: 1,
            max: 20,
            defaultValue: 1,
          ),
          const NumberField(
            label: 'Delivery fee',
            name: 'fee',
            unit: 'DA',
            step: 50,
            min: 0,
            defaultValue: 400,
          ),
          Builder(
            builder: (context) => Button(
              variant: .filled,
              onClick: () => FieldForm.of(context).submit(),
              children: const [Text('Add to order')],
            ),
          ),
          // The browser's `<code>`: monospace at 13/16 of the text size.
          if (sent != null)
            Text(
              sent!,
              style: const TextStyle(
                fontFamily: 'monospace',
                fontSize: 15 * 13 / 16,
              ),
            ),
        ],
      ),
    ),
  );
}
