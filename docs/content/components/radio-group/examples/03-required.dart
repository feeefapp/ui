import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart' hide RadioGroup;

class Required extends StatefulWidget {
  const Required({super.key});

  @override
  State<Required> createState() => _RequiredState();
}

class _RequiredState extends State<Required> {
  String? plan;
  String? error;
  String status = '';

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 360,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 16,
      children: [
        RadioGroup(
          label: 'Plan',
          required: true,
          value: plan ?? '',
          onValueChange: (next) => setState(() {
            plan = next;
            error = null;
          }),
          error: error,
          options: const [
            RadioOption(
              value: 'starter',
              label: Text('Starter'),
              description: Text('Up to 300 orders a month.'),
            ),
            RadioOption(
              value: 'pro',
              label: Text('Pro'),
              description: Text('Unlimited orders, inventory and finance.'),
            ),
          ],
        ),
        Button(
          variant: .filled,
          onClick: () => setState(() {
            if (plan == null) {
              error = 'Choose a plan to continue.';
            } else {
              status = 'Switched to the $plan plan.';
            }
          }),
          children: const [Text('Continue')],
        ),
        // The status paragraph, announced politely (`.lab-app p` has no margins).
        Semantics(
          liveRegion: true,
          child: status.isEmpty ? const SizedBox.shrink() : Text(status),
        ),
      ],
    ),
  );
}
