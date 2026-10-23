import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

const _statuses = [
  (value: 'new', label: 'New', count: 21),
  (value: 'calling', label: 'Calling', count: 14),
  (value: 'no-answer', label: 'No answer', count: 9),
  (value: 'postponed', label: 'Postponed', count: 6),
  (value: 'confirmed', label: 'Confirmed', count: 32),
  (value: 'packed', label: 'Packed', count: 12),
  (value: 'shipped', label: 'Shipped', count: 48),
  (value: 'delivered', label: 'Delivered', count: 120),
  (value: 'returned', label: 'Returned', count: 7),
  (value: 'cancelled', label: 'Cancelled', count: 3),
];

class OrderStatusTabs extends StatefulWidget {
  const OrderStatusTabs({super.key});

  @override
  State<OrderStatusTabs> createState() => _OrderStatusTabsState();
}

class _OrderStatusTabsState extends State<OrderStatusTabs> {
  String _status = 'new';

  @override
  Widget build(BuildContext context) {
    final current = _statuses.firstWhere((s) => s.value == _status);
    return ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 560),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        spacing: 12,
        children: [
          GlassScope(
            child: ToolbarGroup(
              label: 'Order status',
              children: [
                // In a Row the control needs a bounded width to scroll.
                Flexible(
                  child: SegmentedControl<String>(
                    label: 'Order status',
                    value: _status,
                    onChange: (value) => setState(() => _status = value),
                    options: [
                      for (final s in _statuses)
                        SegmentOption(
                          value: s.value,
                          label: s.label,
                          badge: '${s.count}',
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Semantics(
            liveRegion: true,
            child: Text(
              '${current.count} orders in “${current.label}”',
              style: const TextStyle(fontSize: 13),
            ),
          ),
        ],
      ),
    );
  }
}
