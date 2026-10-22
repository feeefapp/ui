import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class Basic extends StatefulWidget {
  const Basic({super.key});

  @override
  State<Basic> createState() => _BasicState();
}

class _BasicState extends State<Basic> {
  bool notify = true;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 360,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 16,
      children: [
        Checkbox(
          label: const Text('Send an SMS when the order ships'),
          checked: notify,
          onCheckedChange: (value) => setState(() => notify = value),
        ),
        const Checkbox(
          label: Text('Allow customers to open the parcel before paying'),
        ),
      ],
    ),
  );
}
