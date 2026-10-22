import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class Required extends StatefulWidget {
  const Required({super.key});

  @override
  State<Required> createState() => _RequiredState();
}

class _RequiredState extends State<Required> {
  bool accepted = false;
  bool submitted = false;
  String status = '';

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 360,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 16,
      children: [
        Checkbox(
          required: true,
          label: const Text('I accept the seller terms'),
          description: const Text(
            'Including the cash-on-delivery return policy.',
          ),
          checked: accepted,
          onCheckedChange: (value) => setState(() => accepted = value),
          error: submitted && !accepted
              ? 'Accept the seller terms to publish your store.'
              : null,
        ),
        Button(
          variant: .filled,
          onClick: () => setState(() {
            submitted = true;
            status = accepted ? 'Store published.' : '';
          }),
          children: const [Text('Publish store')],
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
