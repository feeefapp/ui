import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

const _options = [
  FilterOption(
    id: 'unpaid',
    label: 'Unpaid',
    description: 'Cash not collected yet',
  ),
  FilterOption(
    id: 'returned',
    label: 'Returned',
    keywords: ['refused', 'retour'],
  ),
  FilterOption(id: 'express', label: 'Express delivery'),
];

const _orders = [
  (
    id: '#1048',
    name: 'Amina Benali',
    unpaid: true,
    returned: false,
    express: true,
  ),
  (
    id: '#1047',
    name: 'Yacine Haddad',
    unpaid: false,
    returned: false,
    express: false,
  ),
  (
    id: '#1046',
    name: 'Sara Meziane',
    unpaid: true,
    returned: true,
    express: false,
  ),
  (
    id: '#1045',
    name: 'Karim Saidi',
    unpaid: false,
    returned: false,
    express: true,
  ),
  (
    id: '#1044',
    name: 'Lina Cherif',
    unpaid: true,
    returned: false,
    express: false,
  ),
];

class OnOff extends StatefulWidget {
  const OnOff({super.key});

  @override
  State<OnOff> createState() => _OnOffState();
}

class _OnOffState extends State<OnOff> {
  List<String> _enabled = ['unpaid'];
  List<String> _pinned = ['unpaid', 'express'];

  @override
  Widget build(BuildContext context) {
    final muted = ThemeProvider.of(context).colors.muted;
    final rows = _orders.where(
      (order) => _enabled.every(
        (id) => switch (id) {
          'unpaid' => order.unpaid,
          'returned' => order.returned,
          _ => order.express,
        },
      ),
    );
    return _Frame(
      child: ScrollArea(
        label: 'Orders',
        top: FilterBar(
          label: 'Order filters',
          options: _options,
          value: _enabled,
          onChange: (value) => setState(() => _enabled = value),
          pinned: _pinned,
          onPinnedChange: (value) => setState(() => _pinned = value),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          spacing: 8,
          children: [
            for (final order in rows)
              _Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      spacing: 2,
                      children: [
                        Text(
                          '${order.id} · ${order.name}',
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                        Text(
                          [
                            if (order.unpaid) 'Unpaid',
                            if (order.returned) 'Returned',
                            if (order.express) 'Express',
                          ].join(' · ').ifEmpty('Paid'),
                          style: TextStyle(fontSize: 13 / 1.2, color: muted),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            if (rows.isEmpty)
              Text(
                'No orders match these filters.',
                style: TextStyle(fontSize: 13, color: muted),
              ),
          ],
        ),
      ),
    );
  }
}

extension on String {
  String ifEmpty(String fallback) => isEmpty ? fallback : this;
}

/// `.filter-demo-frame`: a bounded 380px surface the bar and list scroll in.
class _Frame extends StatelessWidget {
  const _Frame({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final radius = BorderRadius.circular(theme.sizes.radiusPanel);
    return Container(
      width: double.infinity,
      height: 380,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: theme.colors.surface,
        border: Border.all(color: theme.colors.line),
        borderRadius: radius,
      ),
      child: child,
    );
  }
}

/// `.filter-demo-row`: a bordered 13px row, content at both ends.
class _Row extends StatelessWidget {
  const _Row({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 14),
      decoration: BoxDecoration(
        border: Border.all(color: theme.colors.line),
        borderRadius: BorderRadius.circular(theme.sizes.radiusSmall),
      ),
      child: DefaultTextStyle.merge(
        style: const TextStyle(fontSize: 13),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          spacing: 12,
          children: children,
        ),
      ),
    );
  }
}
