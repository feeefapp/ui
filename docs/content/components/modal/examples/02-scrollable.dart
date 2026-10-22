import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class Scrollable extends StatefulWidget {
  const Scrollable({super.key});

  @override
  State<Scrollable> createState() => _ScrollableState();
}

class _ScrollableState extends State<Scrollable> {
  bool _open = false;
  String _wilaya = '16';
  String _delivery = 'home';

  void _close() => setState(() => _open = false);

  @override
  Widget build(BuildContext context) => Column(
    mainAxisSize: MainAxisSize.min,
    children: [
      Button(
        variant: .filled,
        onClick: () => setState(() => _open = true),
        children: const [Text('Edit order')],
      ),
      Modal(
        open: _open,
        close: _close,
        label: 'Edit order #10482',
        scrollable: true,
        bottom: Dock(
          label: 'Order actions',
          children: [
            Button(
              variant: .text,
              onClick: _close,
              children: const [Text('Discard')],
            ),
            Button(
              variant: .filled,
              onClick: _close,
              children: const [Text('Save order')],
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          spacing: 16,
          children: [
            const TextField(
              hint: 'Customer name',
              defaultValue: 'Yacine Benali',
            ),
            const TextField(
              hint: 'Phone',
              keyboardType: TextInputType.phone,
              defaultValue: '0555 12 34 56',
            ),
            Select(
              hint: 'Wilaya',
              value: _wilaya,
              onValueChange: (value) => setState(() => _wilaya = value),
              children: const [
                Option(value: '16', child: Text('16 · Alger')),
                Option(value: '31', child: Text('31 · Oran')),
                Option(value: '25', child: Text('25 · Constantine')),
              ],
            ),
            const TextField(hint: 'Commune', defaultValue: 'Bab Ezzouar'),
            const TextField(
              hint: 'Address',
              defaultValue: 'Cité 2068 Logements, Bt 12',
            ),
            Select(
              hint: 'Delivery',
              value: _delivery,
              onValueChange: (value) => setState(() => _delivery = value),
              children: const [
                Option(value: 'home', child: Text('Home delivery · 600 DZD')),
                Option(value: 'desk', child: Text('Stop desk · 400 DZD')),
              ],
            ),
            const TextField(
              hint: 'Quantity',
              keyboardType: TextInputType.number,
              defaultValue: '2',
            ),
            const TextField(
              hint: 'Unit price (DZD)',
              keyboardType: TextInputType.number,
              defaultValue: '3900',
            ),
            const TextField(
              hint: 'Note for the courier',
              multiline: true,
              minLines: 3,
            ),
          ],
        ),
      ),
    ],
  );
}
