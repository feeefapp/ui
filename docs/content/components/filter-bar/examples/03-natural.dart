import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

const _options = [
  FilterOption(id: 'unpaid', label: 'Unpaid', keywords: ['cash', 'not paid']),
  FilterOption(id: 'returned', label: 'Returned', keywords: ['refused']),
  FilterOption(
    id: 'express',
    label: 'Express delivery',
    keywords: ['express', 'fast'],
  ),
];

// Your app supplies the parser: a keyword matcher here, a model call in production.
Future<List<String>> _parse(String text) async {
  final words = text.toLowerCase();
  if (RegExp(r'\b(all|everything|clear)\b').hasMatch(words)) return [];
  final ids = [
    for (final option in _options)
      if ([
        option.label,
        ...option.keywords,
      ].any((word) => words.contains(word.toLowerCase())))
        option.id,
  ];
  if (ids.isEmpty) {
    throw const FilterError(
      'Try “unpaid express orders”, “refused orders” or “show all”.',
    );
  }
  return ids;
}

class Natural extends StatefulWidget {
  const Natural({super.key});

  @override
  State<Natural> createState() => _NaturalState();
}

class _NaturalState extends State<Natural> {
  List<String> _enabled = [];

  @override
  Widget build(BuildContext context) => _Frame(
    child: ScrollArea(
      label: 'Orders',
      top: FilterBar(
        label: 'Order filters',
        options: _options,
        value: _enabled,
        onChange: (value) => setState(() => _enabled = value),
        onNaturalFilter: _parse,
      ),
      child: Text(
        'Enabled filters: ${_enabled.isEmpty ? 'none' : _enabled.join(', ')}. '
        'Use the sparkle button and type a sentence.',
        style: TextStyle(
          fontSize: 13,
          color: ThemeProvider.of(context).colors.muted,
        ),
      ),
    ),
  );
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
