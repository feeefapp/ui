import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class Basic extends StatefulWidget {
  const Basic({super.key});

  @override
  State<Basic> createState() => _BasicState();
}

class _BasicState extends State<Basic> {
  String _delivery = 'home';

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 360,
    child: Column(
      spacing: 16,
      children: [
        SegmentedControl<String>(
          label: 'Delivery type',
          value: _delivery,
          onChange: (value) => setState(() => _delivery = value),
          options: const [
            SegmentOption(value: 'home', label: 'Home delivery'),
            SegmentOption(value: 'desk', label: 'Stop desk'),
          ],
        ),
        Text(
          _delivery == 'home' ? 'Courier fee: 600 DZD' : 'Courier fee: 400 DZD',
        ),
      ],
    ),
  );
}
