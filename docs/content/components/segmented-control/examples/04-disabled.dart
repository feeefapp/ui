import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class Disabled extends StatefulWidget {
  const Disabled({super.key});

  @override
  State<Disabled> createState() => _DisabledState();
}

class _DisabledState extends State<Disabled> {
  String _payment = 'cod';

  @override
  Widget build(BuildContext context) => Column(
    mainAxisSize: MainAxisSize.min,
    spacing: 16,
    children: [
      SegmentedControl<String>(
        label: 'Payment method',
        value: _payment,
        onChange: (value) => setState(() => _payment = value),
        options: const [
          SegmentOption(value: 'cod', label: 'Cash on delivery'),
          SegmentOption(value: 'card', label: 'CIB / Edahabia', disabled: true),
          SegmentOption(value: 'baridimob', label: 'BaridiMob'),
        ],
      ),
      SegmentedControl<String>(
        label: 'Store status',
        value: 'open',
        onChange: (_) {},
        disabled: true,
        options: const [
          SegmentOption(value: 'open', label: 'Open'),
          SegmentOption(value: 'paused', label: 'Paused'),
        ],
      ),
    ],
  );
}
