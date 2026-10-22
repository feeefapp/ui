import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

const _orders = [
  (id: '10231', customer: 'Yacine Haddad', total: '4 500 DZD'),
  (id: '10232', customer: 'Sara Meziane', total: '2 800 DZD'),
  (id: '10233', customer: 'Karim Bensalah', total: '7 200 DZD'),
];

class SelectAll extends StatefulWidget {
  const SelectAll({super.key});

  @override
  State<SelectAll> createState() => _SelectAllState();
}

class _SelectAllState extends State<SelectAll> {
  List<String> selected = ['10232'];

  @override
  Widget build(BuildContext context) {
    final all = selected.length == _orders.length;
    final some = selected.isNotEmpty && !all;
    return SizedBox(
      width: 360,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 16,
        children: [
          Checkbox(
            label: Text('Select all (${selected.length} of ${_orders.length})'),
            checked: all,
            indeterminate: some,
            onCheckedChange: (_) => setState(
              () => selected = all || some
                  ? []
                  : [for (final order in _orders) order.id],
            ),
          ),
          Padding(
            padding: const EdgeInsetsDirectional.only(start: 28),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              spacing: 8,
              children: [
                for (final order in _orders)
                  Checkbox(
                    key: ValueKey(order.id),
                    label: Text('#${order.id} · ${order.customer}'),
                    description: Text(order.total),
                    checked: selected.contains(order.id),
                    onCheckedChange: (checked) => setState(
                      () => selected = checked
                          ? [...selected, order.id]
                          : selected.where((id) => id != order.id).toList(),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
