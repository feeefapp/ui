import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class CompactAndDisabled extends StatelessWidget {
  const CompactAndDisabled({super.key});

  @override
  Widget build(BuildContext context) => const SizedBox(
    width: 360,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 16,
      children: [
        Checkbox(controlSize: .small, label: Text('Show archived products')),
        Checkbox(
          controlSize: .small,
          label: Text('Include out-of-stock variants'),
          defaultChecked: true,
        ),
        Checkbox(
          label: Text('Sync stock with Feeef Cloud'),
          description: Text('Available on the Pro plan.'),
          disabled: true,
        ),
        Checkbox(
          label: Text('Track inventory'),
          defaultChecked: true,
          disabled: true,
        ),
      ],
    ),
  );
}
