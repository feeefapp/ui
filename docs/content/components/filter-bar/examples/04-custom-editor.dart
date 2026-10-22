import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

String _text(FilterValue? value) => value is FilterText ? value.value : '';

final _options = [
  FilterOption.custom(
    id: 'minTotal',
    label: 'Minimum total',
    description: 'Orders worth at least this amount',
    formatValue: (value) => '≥ ${_text(value)} DA',
    validate: (value) {
      final amount = num.tryParse(_text(value));
      return value != null && !(amount != null && amount >= 0)
          ? 'Enter an amount of 0 DA or more.'
          : null;
    },
    renderEditor: (context, value, onChange) => TextField(
      hint: 'Amount in DA',
      keyboardType: TextInputType.number,
      value: _text(value),
      onValueChange: (next) => onChange(next.isEmpty ? null : FilterText(next)),
    ),
  ),
];

const _orders = [
  (id: '#1048', total: 4500),
  (id: '#1047', total: 2900),
  (id: '#1046', total: 7200),
  (id: '#1045', total: 1800),
];

/// `toLocaleString('fr-DZ')`: thousands grouped with a narrow no-break space.
String _amount(int value) => value.toString().replaceAllMapped(
  RegExp(r'\B(?=(\d{3})+(?!\d))'),
  (_) => ' ',
);

class CustomEditor extends StatefulWidget {
  const CustomEditor({super.key});

  @override
  State<CustomEditor> createState() => _CustomEditorState();
}

class _CustomEditorState extends State<CustomEditor> {
  Map<String, FilterValue?> _values = {};
  List<String> _pinned = ['minTotal'];

  @override
  Widget build(BuildContext context) {
    final min = num.tryParse(_text(_values['minTotal'])) ?? 0;
    final filtered = _values['minTotal'] != null;
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
          // A back button while a value is set, and view actions at the end.
          onBack: filtered ? () => setState(() => _values = {}) : null,
          trailing: ToolbarGroup(
            label: 'Order list actions',
            children: [
              IconButton(
                variant: .text,
                appearance: .toolbar,
                controlSize: .compact,
                ariaLabel: 'Export CSV',
                onClick: () {},
                icon: const LucideIcon(LucideIcons.download),
              ),
            ],
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          spacing: 8,
          children: [
            for (final order in _orders.where((order) => order.total >= min))
              _Row(
                children: [
                  Text(
                    'Order ${order.id}',
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  Text('${_amount(order.total)} DA'),
                ],
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
