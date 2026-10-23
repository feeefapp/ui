import 'dart:math' as math;

import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

const _products = [
  'Wireless earbuds',
  'Phone case',
  'Smart watch',
  'Power bank',
  'USB-C cable',
  'Desk lamp',
];

class Search extends StatefulWidget {
  const Search({super.key});

  @override
  State<Search> createState() => _SearchState();
}

class _SearchState extends State<Search> {
  String _query = '';
  bool _grid = true;

  @override
  Widget build(BuildContext context) {
    final rows = _products
        .where((name) => name.toLowerCase().contains(_query.toLowerCase()))
        .toList();
    return _Surface(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ToolbarSearch(
            label: 'Search products',
            placeholder: 'Search by name or SKU',
            value: _query,
            onValueChange: (value) => setState(() => _query = value),
            // Always visible after the search.
            trailing: ToolbarGroup(
              label: 'View',
              children: [
                IconButton(
                  variant: .text,
                  appearance: .toolbar,
                  ariaLabel: _grid ? 'Show as list' : 'Show as grid',
                  onClick: () => setState(() => _grid = !_grid),
                  icon: LucideIcon(
                    _grid ? LucideIcons.list : LucideIcons.layoutGrid,
                  ),
                ),
              ],
            ),
            // Children sit beside the closed search button; their glass is absorbed while the
            // field is open.
            children: [
              ToolbarGroup(
                label: 'Filters',
                children: [
                  IconButton(
                    variant: .text,
                    appearance: .toolbar,
                    ariaLabel: 'Filters',
                    onClick: () {},
                    icon: const LucideIcon(LucideIcons.slidersHorizontal),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          _Grid(columns: _grid ? null : 1, names: rows),
        ],
      ),
    );
  }
}

/// `.toolbar-demo-content`: `repeat(auto-fill, minmax(120px, 1fr))` with an 8px gap, or one
/// column in list mode.
class _Grid extends StatelessWidget {
  const _Grid({required this.columns, required this.names});

  final int? columns;
  final List<String> names;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    return LayoutBuilder(
      builder: (context, constraints) {
        const gap = 8.0;
        final width = constraints.maxWidth;
        final count =
            columns ?? math.max(1, ((width + gap) / (120 + gap)).floor());
        final cell = (width - gap * (count - 1)) / count;
        Widget card(String name) => Container(
          width: cell,
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            border: Border.all(color: theme.colors.line),
            borderRadius: BorderRadius.circular(theme.sizes.radiusSmall),
          ),
          child: DefaultTextStyle.merge(
            style: const TextStyle(fontSize: 13),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name),
                // `<small>`: font-size smaller (÷1.2), muted.
                Text(
                  'In stock',
                  style: TextStyle(
                    fontSize: 13 / 1.2,
                    color: theme.colors.muted,
                  ),
                ),
              ],
            ),
          ),
        );
        // Grid rows: every cell of a row stretches to the tallest one.
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          spacing: gap,
          children: [
            for (var i = 0; i < names.length; i += count)
              IntrinsicHeight(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  spacing: gap,
                  children: [
                    for (final name in names.skip(i).take(count)) card(name),
                  ],
                ),
              ),
          ],
        );
      },
    );
  }
}

/// `.toolbar-demo-surface`: toolbars float over content, so the demo gives them some.
class _Surface extends StatelessWidget {
  const _Surface({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: ShapeDecoration(
        color: theme.colors.surface,
        // A plain rounded rectangle (no corner-shape in the demo CSS).
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(theme.sizes.radiusPanel),
          side: BorderSide(color: theme.colors.line),
        ),
      ),
      child: child,
    );
  }
}
