import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class Validation extends StatefulWidget {
  const Validation({super.key});

  @override
  State<Validation> createState() => _ValidationState();
}

class _ValidationState extends State<Validation> {
  // A controller holds the value, like a TextField's controller.
  final price = ValueNotifier<double>(0);
  double? saved;

  @override
  void dispose() {
    price.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => FieldForm(
    onSubmit: (_) => setState(() => saved = price.value),
    child: SizedBox(
      width: 360,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 16,
        children: [
          NumberField(
            label: 'Price',
            name: 'price',
            unit: 'DA',
            step: 50,
            min: 0,
            controller: price,
            supportingText: const Text('What the customer pays on delivery.'),
            validator: (value) =>
                value <= 0 ? 'Enter a price above 0 DA.' : null,
          ),
          const NumberField(
            label: 'Stock',
            name: 'stock',
            min: 0,
            defaultValue: 12,
            error: 'Stock changed while you edited. Reload it.',
          ),
          Builder(
            builder: (context) => Button(
              variant: .filled,
              onClick: () => FieldForm.of(context).submit(),
              children: const [Text('Save product')],
            ),
          ),
          if (saved != null) Text('Saved at ${saved!.toInt()} DA.'),
        ],
      ),
    ),
  );
}
