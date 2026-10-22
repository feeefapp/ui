import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class Description extends StatelessWidget {
  const Description({super.key});

  @override
  Widget build(BuildContext context) => Semantics(
    container: true,
    label: 'Order notifications',
    child: const SizedBox(
      width: 360,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // The fieldset's legend sits outside the 16px grid, 12px above it.
          ExcludeSemantics(
            child: Text(
              'Order notifications',
              style: TextStyle(fontWeight: FontWeight.w600),
            ),
          ),
          SizedBox(height: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: 16,
            children: [
              Checkbox(
                defaultChecked: true,
                label: Text('SMS to the customer'),
                description: Text(
                  'One SMS credit per order. You have 412 left.',
                ),
              ),
              Checkbox(
                label: Text('WhatsApp message'),
                description: Text(
                  'Needs a connected WhatsApp Business number.',
                ),
              ),
              Checkbox(
                label: Text('Email to the store owner'),
                description: Text('Sent to owner@dzshop.dz.'),
              ),
            ],
          ),
        ],
      ),
    ),
  );
}
