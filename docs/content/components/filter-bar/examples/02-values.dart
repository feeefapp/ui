import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

const _options = [
  FilterOption.choices(
    id: 'wilaya',
    label: 'Wilaya',
    choices: [
      FilterChoice(value: 'alger', label: 'Alger'),
      FilterChoice(value: 'oran', label: 'Oran'),
      FilterChoice(value: 'constantine', label: 'Constantine'),
      FilterChoice(value: 'blida', label: 'Blida'),
    ],
  ),
  FilterOption.choices(
    id: 'courier',
    label: 'Courier',
    choices: [
      FilterChoice(value: 'yalidine', label: 'Yalidine'),
      FilterChoice(value: 'zr', label: 'ZR Express'),
      FilterChoice(value: 'maystro', label: 'Maystro'),
    ],
  ),
  FilterOption.temporal(
    id: 'created',
    label: 'Created',
    config: TemporalConfig(type: TemporalType.dateRange),
    description: 'Order date, inclusive',
  ),
  FilterOption.temporal(
    id: 'window',
    label: 'Delivery window',
    config: TemporalConfig(
      type: TemporalType.timeRange,
      presets: [
        TemporalPreset(
          label: 'Morning',
          value: TemporalRange(from: '08:00', to: '12:00'),
        ),
        TemporalPreset(
          label: 'Afternoon',
          value: TemporalRange(from: '13:00', to: '18:00'),
        ),
      ],
    ),
  ),
];

const _orders = [
  (id: '#1048', wilaya: 'alger', courier: 'yalidine', created: '2026-10-18'),
  (id: '#1047', wilaya: 'oran', courier: 'zr', created: '2026-10-17'),
  (
    id: '#1046',
    wilaya: 'constantine',
    courier: 'yalidine',
    created: '2026-10-12',
  ),
  (id: '#1045', wilaya: 'alger', courier: 'maystro', created: '2026-10-09'),
  (id: '#1044', wilaya: 'blida', courier: 'zr', created: '2026-10-02'),
];

class Values extends StatefulWidget {
  const Values({super.key});

  @override
  State<Values> createState() => _ValuesState();
}

class _ValuesState extends State<Values> {
  Map<String, FilterValue?> _values = {'wilaya': const FilterText('alger')};
  List<String> _pinned = ['wilaya', 'created'];

  @override
  Widget build(BuildContext context) {
    final muted = ThemeProvider.of(context).colors.muted;
    String? text(String id) => switch (_values[id]) {
      FilterText(:final value) => value,
      _ => null,
    };
    final created = _values['created'] is FilterRange
        ? _values['created']! as FilterRange
        : null;
    final wilaya = text('wilaya'), courier = text('courier');
    final rows = _orders.where(
      (order) =>
          (wilaya == null || order.wilaya == wilaya) &&
          (courier == null || order.courier == courier) &&
          (created == null ||
              created.from.isEmpty ||
              order.created.compareTo(created.from) >= 0) &&
          (created == null ||
              created.to.isEmpty ||
              order.created.compareTo(created.to) <= 0),
    );
    return _Frame(
      child: ScrollArea(
        label: 'Orders',
        top: FilterBar(
          label: 'Order filters',
          options: _options,
          value: const [],
          onChange: (_) {},
          values: _values,
          onValuesChange: (values) => setState(() => _values = values),
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
                          'Order ${order.id}',
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                        Text(
                          '${order.wilaya} · ${order.courier} · ${order.created}',
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
