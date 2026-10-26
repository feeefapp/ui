import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

String? _phoneError(String value) =>
    RegExp(r'^0[567]\d{8}$').hasMatch(value.replaceAll(RegExp(r'\s'), ''))
    ? null
    : 'Use 10 digits starting with 05, 06 or 07.';

class Validation extends StatefulWidget {
  const Validation({super.key});

  @override
  State<Validation> createState() => _ValidationState();
}

class _ValidationState extends State<Validation> {
  String status = '';

  @override
  Widget build(BuildContext context) => FieldForm(
    onSubmit: (_) => setState(() => status = 'Order saved.'),
    onReset: () => setState(() => status = ''),
    child: SizedBox(
      width: 360,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 16,
        children: [
          const TextField(
            hint: 'Customer name',
            name: 'name',
            required: true,
            minLength: 3,
          ),
          const TextField(
            hint: 'Phone number',
            name: 'phone',
            keyboardType: TextInputType.phone,
            required: true,
            validator: _phoneError,
            supportingText: Text('Checked when you leave the field.'),
          ),
          const TextField(
            hint: 'Email (optional)',
            name: 'email',
            keyboardType: TextInputType.emailAddress,
            validationMode: .change,
            supportingText: Text('Checked as you type.'),
          ),
          Builder(
            builder: (context) => Wrap(
              spacing: 12,
              runSpacing: 12,
              alignment: WrapAlignment.center,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                Button(
                  variant: .text,
                  onClick: () => FieldForm.of(context).reset(),
                  children: const [Text('Reset')],
                ),
                Button(
                  variant: .filled,
                  onClick: () => FieldForm.of(context).submit(),
                  children: const [Text('Save order')],
                ),
              ],
            ),
          ),
          Semantics(
            liveRegion: true,
            child: status.isEmpty ? const SizedBox.shrink() : Text(status),
          ),
        ],
      ),
    ),
  );
}
