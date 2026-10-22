import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart' hide RadioGroup;

const _couriers = [
  (id: 'yalidine', name: 'Yalidine', price: '600 DZD', days: '2–3 days'),
  (id: 'zrexpress', name: 'ZR Express', price: '550 DZD', days: '3–4 days'),
  (id: 'maystro', name: 'Maystro Delivery', price: '650 DZD', days: '1–2 days'),
];

class SingleRadio extends StatefulWidget {
  const SingleRadio({super.key});

  @override
  State<SingleRadio> createState() => _SingleRadioState();
}

class _SingleRadioState extends State<SingleRadio> {
  String courier = 'yalidine';

  @override
  Widget build(BuildContext context) {
    final line = ThemeProvider.of(context).colors.line;
    return Semantics(
      container: true,
      label: 'Courier for this order',
      child: SizedBox(
        width: 560,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const ExcludeSemantics(
              child: Text(
                'Courier for this order',
                style: TextStyle(fontWeight: FontWeight.w600),
              ),
            ),
            const SizedBox(height: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              spacing: 8,
              children: [
                for (final option in _couriers)
                  Container(
                    key: ValueKey(option.id),
                    padding: const EdgeInsets.symmetric(
                      vertical: 10,
                      horizontal: 14,
                    ),
                    decoration: BoxDecoration(
                      border: Border.all(color: line),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      spacing: 12,
                      children: [
                        Flexible(
                          child: Radio(
                            label: Text(option.name),
                            description: Text(option.days),
                            checked: courier == option.id,
                            onCheckedChange: (checked) {
                              if (checked) setState(() => courier = option.id);
                            },
                          ),
                        ),
                        Text(
                          option.price,
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
