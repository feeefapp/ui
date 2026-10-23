import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

const _couriers = {
  'home': [
    'Yalidine · 600 DZD · 2 days',
    'ZR Express · 650 DZD · 1 day',
    'Maystro · 550 DZD · 3 days',
  ],
  'desk': ['Yalidine stop desk · 400 DZD', 'ZR Express agency · 450 DZD'],
};

class CustomTop extends StatefulWidget {
  const CustomTop({super.key});

  @override
  State<CustomTop> createState() => _CustomTopState();
}

class _CustomTopState extends State<CustomTop> {
  bool _open = false;
  String _mode = 'home';

  void _close() => setState(() => _open = false);

  @override
  Widget build(BuildContext context) => Column(
    mainAxisSize: MainAxisSize.min,
    children: [
      Button(
        variant: .outlined,
        onClick: () => setState(() => _open = true),
        children: const [Text('Choose courier')],
      ),
      Modal(
        open: _open,
        close: _close,
        label: 'Choose a courier',
        scrollable: true,
        fitContent: true,
        top: ToolbarGroup(
          label: 'Delivery type',
          children: [
            SegmentedControl<String>(
              label: 'Delivery type',
              value: _mode,
              onChange: (value) => setState(() => _mode = value),
              options: const [
                SegmentOption(value: 'home', label: 'Home'),
                SegmentOption(value: 'desk', label: 'Stop desk'),
              ],
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          spacing: 8,
          children: [
            for (final courier in _couriers[_mode]!)
              Button(
                variant: .elevated,
                onClick: _close,
                children: [Text(courier)],
              ),
          ],
        ),
      ),
    ],
  );
}
