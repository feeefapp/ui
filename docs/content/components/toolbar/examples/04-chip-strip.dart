import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

const _filters = [
  'All orders',
  'New',
  'Confirmed',
  'Packed',
  'Shipped',
  'Delivered',
  'Returned',
  'Cancelled',
  'Drafts',
];

class ChipStrip extends StatefulWidget {
  const ChipStrip({super.key});

  @override
  State<ChipStrip> createState() => _ChipStripState();
}

class _ChipStripState extends State<ChipStrip> {
  String _active = 'All orders';

  @override
  Widget build(BuildContext context) => _Surface(
    child: Toolbar(
      label: 'Orders',
      // A plain scroll view: its glass is cut at its edges and moves with its scroll.
      leading: ScrollConfiguration(
        behavior: ScrollConfiguration.of(context).copyWith(scrollbars: false),
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            spacing: 8,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              for (final filter in _filters)
                ToolbarGroup(
                  label: filter,
                  children: [
                    Button(
                      variant: .text,
                      appearance: .toolbar,
                      pressed: filter == _active,
                      onClick: () => setState(() => _active = filter),
                      children: [Text(filter)],
                    ),
                  ],
                ),
            ],
          ),
        ),
      ),
      trailing: ToolbarGroup(
        label: 'Filter actions',
        children: [
          IconButton(
            variant: .text,
            appearance: .toolbar,
            ariaLabel: 'More filters',
            onClick: () {},
            icon: const LucideIcon(LucideIcons.slidersHorizontal),
          ),
        ],
      ),
    ),
  );
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
