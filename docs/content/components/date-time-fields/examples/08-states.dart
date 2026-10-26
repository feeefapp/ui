import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class States extends StatelessWidget {
  const States({super.key});

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 360,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 16,
      children: [
        DateField(
          hint: 'Order date',
          value: '2026-10-14',
          onValueChange: (_) {},
          readOnly: true,
          supportingText: const Text('Set when the customer placed the order.'),
        ),
        TimeField(
          hint: 'Pickup time',
          value: '09:00',
          onValueChange: (_) {},
          disabled: true,
        ),
        DateField(
          hint: 'Delivery date',
          value: '2026-10-23',
          onValueChange: (_) {},
          leadingIcon: const LucideIcon(LucideIcons.calendarX),
          error: 'Yalidine has no capacity in Oran on this day.',
        ),
      ],
    ),
  );
}
