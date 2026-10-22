import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class Compact extends StatelessWidget {
  const Compact({super.key});

  @override
  Widget build(BuildContext context) => const Wrap(
    spacing: 12,
    runSpacing: 12,
    alignment: WrapAlignment.center,
    crossAxisAlignment: WrapCrossAlignment.center,
    children: [
      SizedBox(
        width: 160,
        child: TextField(
          controlSize: .compact,
          hint: 'SKU',
          defaultValue: 'TSH-BLK-M',
        ),
      ),
      SizedBox(
        width: 120,
        child: TextField(
          controlSize: .compact,
          hint: 'Quantity',
          keyboardType: TextInputType.number,
          defaultValue: '2',
        ),
      ),
      SizedBox(
        width: 160,
        child: TextField(
          controlSize: .compact,
          hint: 'Unit price',
          keyboardType: TextInputType.number,
          defaultValue: '2500',
          trailing: Text('DZD'),
        ),
      ),
    ],
  );
}
