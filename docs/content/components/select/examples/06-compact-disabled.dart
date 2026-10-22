import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class CompactAndDisabled extends StatefulWidget {
  const CompactAndDisabled({super.key});

  @override
  State<CompactAndDisabled> createState() => _CompactAndDisabledState();
}

class _CompactAndDisabledState extends State<CompactAndDisabled> {
  String size = 'M';

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 360,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 16,
      children: [
        Select(
          controlSize: .compact,
          labelStyle: .inside,
          hint: 'Size',
          value: size,
          onValueChange: (value) => setState(() => size = value),
          children: const [
            Option(child: Text('S')),
            Option(child: Text('M')),
            Option(child: Text('L')),
            Option(child: Text('XL')),
          ],
        ),
        Select(
          hint: 'Store currency',
          value: 'DZD',
          onValueChange: (_) {},
          disabled: true,
          supportingText: const Text('Set when the store was created.'),
          children: const [
            Option(value: 'DZD', child: Text('Algerian dinar (DZD)')),
          ],
        ),
      ],
    ),
  );
}
