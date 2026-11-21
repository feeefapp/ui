import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

typedef _Order = ({
  String id,
  String customer,
  String wilaya,
  String courier,
  String total,
  bool confirmed,
  bool called,
});

const List<_Order> _orders = [
  (
    id: '1048',
    customer: 'Amina Benali',
    wilaya: 'Alger',
    courier: 'Yalidine',
    total: '9 600 DA',
    confirmed: false,
    called: true,
  ),
  (
    id: '1047',
    customer: 'Yacine Haddad',
    wilaya: 'Oran',
    courier: 'ZR Express',
    total: '2 900 DA',
    confirmed: false,
    called: false,
  ),
  (
    id: '1046',
    customer: 'Sara Meziane',
    wilaya: 'Constantine',
    courier: 'Yalidine',
    total: '7 200 DA',
    confirmed: true,
    called: true,
  ),
  (
    id: '1045',
    customer: 'Karim Saidi',
    wilaya: 'Blida',
    courier: 'Maystro',
    total: '3 100 DA',
    confirmed: false,
    called: false,
  ),
  (
    id: '1044',
    customer: 'Lina Cherif',
    wilaya: 'Sétif',
    courier: 'ZR Express',
    total: '5 650 DA',
    confirmed: false,
    called: true,
  ),
  (
    id: '1043',
    customer: 'Omar Belkacem',
    wilaya: 'Annaba',
    courier: 'Yalidine',
    total: '1 800 DA',
    confirmed: false,
    called: false,
  ),
  (
    id: '1042',
    customer: 'Nour Hamidi',
    wilaya: 'Alger',
    courier: 'Maystro',
    total: '4 300 DA',
    confirmed: true,
    called: true,
  ),
];

final _filters = [
  const FilterOption(
    id: 'notCalled',
    label: 'Not called yet',
    description: 'No confirmation call so far',
  ),
  FilterOption.choices(
    id: 'wilaya',
    label: 'Wilaya',
    choices: [
      for (final name in [
        'Alger',
        'Oran',
        'Constantine',
        'Blida',
        'Sétif',
        'Annaba',
      ])
        FilterChoice(value: name, label: name),
    ],
  ),
  FilterOption.choices(
    id: 'courier',
    label: 'Courier',
    choices: [
      for (final name in ['Yalidine', 'ZR Express', 'Maystro'])
        FilterChoice(value: name, label: name),
    ],
  ),
];

class OrdersList extends StatefulWidget {
  const OrdersList({super.key});

  @override
  State<OrdersList> createState() => _OrdersListState();
}

class _OrdersListState extends State<OrdersList> {
  List<_Order> _all = _orders;
  String _query = '';
  List<String> _toggles = [];
  Map<String, FilterValue?> _values = {};
  List<String> _pinned = ['notCalled'];
  List<String> _selected = [];

  String? _text(String id) => switch (_values[id]) {
    FilterText(:final value) => value,
    _ => null,
  };

  void _toggle(String id, bool on) => setState(
    () => _selected = on
        ? [..._selected, id]
        : _selected.where((value) => value != id).toList(),
  );

  void _clearFilters() => setState(() {
    _query = '';
    _toggles = [];
    _values = {};
  });

  void _confirmSelected() => setState(() {
    _all = [
      for (final order in _all)
        _selected.contains(order.id)
            ? (
                id: order.id,
                customer: order.customer,
                wilaya: order.wilaya,
                courier: order.courier,
                total: order.total,
                confirmed: true,
                called: order.called,
              )
            : order,
    ];
    _selected = [];
  });

  @override
  Widget build(BuildContext context) {
    final q = _query.trim().toLowerCase();
    final wilaya = _text('wilaya'), courier = _text('courier');
    final rows = _all
        .where(
          (order) =>
              (q.isEmpty ||
                  '${order.id} ${order.customer}'.toLowerCase().contains(q)) &&
              (!_toggles.contains('notCalled') || !order.called) &&
              (wilaya == null || order.wilaya == wilaya) &&
              (courier == null || order.courier == courier),
        )
        .toList();
    final visibleSelected = _selected
        .where((id) => rows.any((order) => order.id == id))
        .toList();
    final allSelected =
        rows.isNotEmpty && visibleSelected.length == rows.length;
    final muted = ThemeProvider.of(context).colors.muted;

    return _Frame(
      child: ScrollArea(
        label: 'Orders',
        // The search springs open over the row; the filter bar sits beside it while it is closed.
        top: ToolbarSearch(
          label: 'Search orders',
          placeholder: 'Order number or name',
          value: _query,
          onValueChange: (value) => setState(() => _query = value),
          children: [
            FilterBar(
              label: 'Order filters',
              options: _filters,
              value: _toggles,
              onChange: (value) => setState(() => _toggles = value),
              values: _values,
              onValuesChange: (values) => setState(() => _values = values),
              pinned: _pinned,
              onPinnedChange: (value) => setState(() => _pinned = value),
            ),
          ],
        ),
        bottom: visibleSelected.isNotEmpty
            ? Dock(
                label: 'Selected orders',
                swapKey: 'selected',
                content: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  child: Text(
                    '${visibleSelected.length} selected',
                    softWrap: false,
                  ),
                ),
                children: [
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    spacing: 4,
                    children: [
                      IconButton(
                        variant: .text,
                        appearance: .toolbar,
                        ariaLabel: 'Clear selection',
                        onClick: () => setState(() => _selected = []),
                        icon: const LucideIcon(LucideIcons.x),
                      ),
                      Button(
                        variant: .tonal,
                        onClick: () {},
                        children: const [
                          LucideIcon(LucideIcons.truck),
                          Text('Assign courier'),
                        ],
                      ),
                      Button(
                        variant: .filled,
                        onClick: _confirmSelected,
                        children: [Text('Confirm ${visibleSelected.length}')],
                      ),
                    ],
                  ),
                ],
              )
            : Dock(
                label: 'Order actions',
                swapKey: 'idle',
                children: [
                  Button(
                    variant: .filled,
                    onClick: () {},
                    children: const [
                      LucideIcon(LucideIcons.plus),
                      Text('New order'),
                    ],
                  ),
                ],
              ),
        child: rows.isNotEmpty
            ? Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                spacing: 8,
                children: [
                  // `.pt-list-head`: 4px inline padding, 13px muted.
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    child: DefaultTextStyle.merge(
                      style: TextStyle(fontSize: 13, color: muted),
                      child: Align(
                        alignment: AlignmentDirectional.centerStart,
                        child: Checkbox(
                          controlSize: .small,
                          label: Text('${rows.length} orders'),
                          checked: allSelected,
                          indeterminate:
                              visibleSelected.isNotEmpty && !allSelected,
                          onCheckedChange: (on) => setState(
                            () => _selected = on
                                ? [for (final order in rows) order.id]
                                : [],
                          ),
                        ),
                      ),
                    ),
                  ),
                  for (final order in rows)
                    _OrderRow(
                      order: order,
                      selected: _selected.contains(order.id),
                      onChanged: (on) => _toggle(order.id, on),
                    ),
                ],
              )
            : _NoResults(
                query: q.isEmpty ? null : _query.trim(),
                onClear: _clearFilters,
              ),
      ),
    );
  }
}

/// `.pt-state`: what is empty and the way back.
class _NoResults extends StatelessWidget {
  const _NoResults({required this.query, required this.onClear});

  final String? query;
  final VoidCallback onClear;

  @override
  Widget build(BuildContext context) => Semantics(
    liveRegion: true,
    child: ConstrainedBox(
      constraints: const BoxConstraints(minHeight: 300),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          spacing: 12,
          children: [
            Semantics(
              header: true,
              child: const Text(
                'No orders match',
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w500,
                  letterSpacing: 17 * -0.035,
                  height: 19 / 17,
                  leadingDistribution: TextLeadingDistribution.even,
                ),
              ),
            ),
            ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 340),
              child: Text(
                'Nothing matches ${query != null ? '“$query” with ' : ''}these filters. Clear them to see every order again.',
                textAlign: TextAlign.center,
                style: TextStyle(color: ThemeProvider.of(context).colors.muted),
              ),
            ),
            Button(
              variant: .tonal,
              onClick: onClear,
              children: const [Text('Clear search and filters')],
            ),
          ],
        ),
      ),
    ),
  );
}

/// `.pt-row`: a bordered row; selected rows take a primary tint.
class _OrderRow extends StatelessWidget {
  const _OrderRow({
    required this.order,
    required this.selected,
    required this.onChanged,
  });

  final _Order order;
  final bool selected;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    return DecoratedBox(
      decoration: ShapeDecoration(
        color: selected ? Color.lerp(c.surface, c.primary, 0.06) : c.surface,
        shape: SuperellipseBorder(
          radius: theme.sizes.radiusSmall,
          side: BorderSide(
            color: selected ? Color.lerp(c.line, c.primary, 0.45)! : c.line,
          ),
        ),
      ),
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 64),
        child: Checkbox(
          checked: selected,
          onCheckedChange: onChanged,
          label: Row(
            spacing: 12,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('#${order.id} · ${order.customer}'),
                    Text(
                      '${order.wilaya} · ${order.courier}',
                      style: TextStyle(fontSize: 12, color: c.muted),
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    order.total,
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  _Tag(
                    order.confirmed
                        ? 'Confirmed'
                        : order.called
                        ? 'Called'
                        : 'New',
                    success: order.confirmed,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// `.pt-tag`: a quiet 12px pill; success is a soft green.
class _Tag extends StatelessWidget {
  const _Tag(this.text, {this.success = false});

  final String text;
  final bool success;

  @override
  Widget build(BuildContext context) {
    final c = ThemeProvider.of(context).colors;
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 2, horizontal: 8),
      decoration: BoxDecoration(
        color: success ? c.success.withValues(alpha: 0.14) : c.surfaceSoft,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        text,
        softWrap: false,
        style: TextStyle(fontSize: 12, color: success ? c.ink : c.muted),
      ),
    );
  }
}

/// `.pt-frame`: a bounded 460px, 14px surface with a superellipse panel corner.
class _Frame extends StatelessWidget {
  const _Frame({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    return Container(
      width: double.infinity,
      height: 460,
      clipBehavior: Clip.antiAlias,
      decoration: ShapeDecoration(
        color: theme.colors.surface,
        shape: SuperellipseBorder(
          radius: theme.sizes.radiusPanel,
          side: BorderSide(color: theme.colors.line),
        ),
      ),
      child: DefaultTextStyle.merge(
        style: const TextStyle(fontSize: 14),
        child: child,
      ),
    );
  }
}
