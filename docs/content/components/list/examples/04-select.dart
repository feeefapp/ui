import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

const _payouts = [
  (id: '1042', name: 'Amina Benali', amount: '12,450.00 DA · due today'),
  (id: '1043', name: 'Yacine Haddad', amount: '3,900.00 DA · due Friday'),
  (id: '1044', name: 'Sara Meziane', amount: '820.00 DA'),
];

class SelectRows extends StatefulWidget {
  const SelectRows({super.key});

  @override
  State<SelectRows> createState() => _SelectRowsState();
}

class _SelectRowsState extends State<SelectRows> {
  final selected = <String>{'1042'};

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 560,
    child: ListSection(
      header: const Text('Courier payouts'),
      children: [
        for (final payout in _payouts)
          Checkbox(
            checked: selected.contains(payout.id),
            onCheckedChange: (on) => setState(
              () => on ? selected.add(payout.id) : selected.remove(payout.id),
            ),
            label: Row(
              spacing: 12,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [Text(payout.name), Text('Payout #${payout.id}')],
                  ),
                ),
                Flexible(child: Text(payout.amount, textAlign: TextAlign.end)),
              ],
            ),
          ),
      ],
    ),
  );
}
