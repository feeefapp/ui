import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class Validation extends StatefulWidget {
  const Validation({super.key});

  @override
  State<Validation> createState() => _ValidationState();
}

class _ValidationState extends State<Validation> {
  String? method;
  String? wilaya = 'Tamanrasset';
  String status = '';

  @override
  Widget build(BuildContext context) => FieldForm(
    onSubmit: (_) => setState(() => status = 'Shipping $method to $wilaya.'),
    child: SizedBox(
      width: 360,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 16,
        children: [
          Select(
            hint: 'Delivery method',
            name: 'method',
            required: true,
            requiredMessage: 'Choose how the order is delivered.',
            leadingIcon: const LucideIcon(LucideIcons.truck),
            value: method,
            onValueChange: (value) => setState(() => method = value),
            children: const [
              Option(value: 'home', child: Text('Home delivery')),
              Option(value: 'desk', child: Text('Stop desk')),
            ],
          ),
          Select(
            hint: 'Wilaya',
            name: 'wilaya',
            value: wilaya,
            onValueChange: (value) => setState(() => wilaya = value),
            validator: (value) => method == 'home' && value == 'Tamanrasset'
                ? 'Home delivery is not available here yet.'
                : null,
            validationMode: .change,
            supportingText: const Text('Try home delivery to Tamanrasset.'),
            children: const [
              Option(child: Text('Alger')),
              Option(child: Text('Oran')),
              Option(child: Text('Tamanrasset')),
            ],
          ),
          Builder(
            builder: (context) => Button(
              variant: .filled,
              onClick: () => FieldForm.of(context).submit(),
              children: const [Text('Ship order')],
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
