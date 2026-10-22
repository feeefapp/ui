import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

const _settings = [
  (
    id: 'cod',
    label: 'Cash on delivery',
    description: 'Customers pay the courier when the parcel arrives.',
  ),
  (
    id: 'stopdesk',
    label: 'Stop desk pickup',
    description: 'Offer pickup at the courier’s office at a lower price.',
  ),
  (
    id: 'reviews',
    label: 'Product reviews',
    description: 'Ask delivered customers to rate what they bought.',
  ),
];

class Basic extends StatefulWidget {
  const Basic({super.key});

  @override
  State<Basic> createState() => _BasicState();
}

class _BasicState extends State<Basic> {
  final enabled = <String, bool>{
    'cod': true,
    'stopdesk': true,
    'reviews': false,
  };

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 560,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 16,
      children: [
        for (final setting in _settings)
          Row(
            key: ValueKey(setting.id),
            spacing: 16,
            children: [
              Expanded(
                child: ExcludeSemantics(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        setting.label,
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                      // `<small>`: 12.5px text on the paragraph's 24px line.
                      Text(
                        setting.description,
                        style: const TextStyle(fontSize: 12.5),
                        strutStyle: const StrutStyle(
                          fontSize: 15,
                          height: 1.6,
                          leadingDistribution: TextLeadingDistribution.even,
                          forceStrutHeight: true,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              SlideSwitch(
                label: setting.label,
                checked: enabled[setting.id],
                onCheckedChange: (checked) =>
                    setState(() => enabled[setting.id] = checked),
              ),
            ],
          ),
      ],
    ),
  );
}
