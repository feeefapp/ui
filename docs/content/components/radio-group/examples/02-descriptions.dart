import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart' hide RadioGroup;

class Descriptions extends StatelessWidget {
  const Descriptions({super.key});

  @override
  Widget build(BuildContext context) => const SizedBox(
    width: 360,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 16,
      children: [
        RadioGroup(
          label: 'Delivery type',
          description: Text(
            'Prices are shown at checkout for the customer’s wilaya.',
          ),
          defaultValue: 'home',
          options: [
            RadioOption(
              value: 'home',
              label: Text('Home delivery'),
              description: Text(
                'The courier brings the parcel to the door. 600 DZD.',
              ),
            ),
            RadioOption(
              value: 'desk',
              label: Text('Stop desk'),
              description: Text('Pickup at the courier’s office. 400 DZD.'),
            ),
            RadioOption(
              value: 'store',
              label: Text('Store pickup'),
              description: Text('Collected from your shop. Free.'),
              disabled: true,
            ),
          ],
        ),
      ],
    ),
  );
}
