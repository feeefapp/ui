import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart' hide RadioGroup;

class Compact extends StatelessWidget {
  const Compact({super.key});

  @override
  Widget build(BuildContext context) => const SizedBox(
    width: 360,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 16,
      children: [
        RadioGroup(
          label: 'Show orders from',
          controlSize: .compact,
          defaultValue: '7d',
          options: [
            RadioOption(value: 'today', label: Text('Today')),
            RadioOption(value: '7d', label: Text('Last 7 days')),
            RadioOption(value: '30d', label: Text('Last 30 days')),
            RadioOption(value: 'all', label: Text('All time')),
          ],
        ),
      ],
    ),
  );
}
