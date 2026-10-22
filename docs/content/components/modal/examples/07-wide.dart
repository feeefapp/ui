import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

const _customers = [
  (name: 'Yacine Benali', phone: '0555 12 34 56', city: 'Bab Ezzouar, Alger'),
  (name: 'Yacine B.', phone: '0555123456', city: 'Bab Ezzouar, Alger'),
];

class Wide extends StatefulWidget {
  const Wide({super.key});

  @override
  State<Wide> createState() => _WideState();
}

class _WideState extends State<Wide> {
  bool _open = false;

  void _close() => setState(() => _open = false);

  @override
  Widget build(BuildContext context) => Column(
    mainAxisSize: MainAxisSize.min,
    children: [
      Button(
        variant: .outlined,
        onClick: () => setState(() => _open = true),
        children: const [Text('Compare addresses')],
      ),
      Modal(
        open: _open,
        close: _close,
        label: 'Merge duplicate customers',
        scrollable: true,
        fitContent: true,
        wide: true,
        bottom: Dock(
          label: 'Merge actions',
          children: [
            Button(
              variant: .text,
              onClick: _close,
              children: const [Text('Keep both')],
            ),
            Button(
              variant: .filled,
              onClick: _close,
              children: const [Text('Merge customers')],
            ),
          ],
        ),
        // `repeat(auto-fit, minmax(240px, 1fr))` with a 24px gap: side by side when there is room.
        child: LayoutBuilder(
          builder: (context, constraints) {
            final columns = ((constraints.maxWidth + 24) / (240 + 24))
                .floor()
                .clamp(1, _customers.length);
            final width = (constraints.maxWidth - 24 * (columns - 1)) / columns;
            return Wrap(
              spacing: 24,
              runSpacing: 24,
              children: [
                for (final (index, customer) in _customers.indexed)
                  SizedBox(
                    width: width,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      spacing: 12,
                      children: [
                        Text(
                          index == 0 ? 'Existing customer' : 'New order',
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                        TextField(hint: 'Name', defaultValue: customer.name),
                        TextField(hint: 'Phone', defaultValue: customer.phone),
                        TextField(hint: 'City', defaultValue: customer.city),
                      ],
                    ),
                  ),
              ],
            );
          },
        ),
      ),
    ],
  );
}
