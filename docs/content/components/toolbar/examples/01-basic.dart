import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class Basic extends StatelessWidget {
  const Basic({super.key});

  @override
  Widget build(BuildContext context) => _Surface(
    child: Toolbar(
      label: 'Products',
      leading: ToolbarGroup(
        label: 'Navigation',
        children: [
          IconButton(
            variant: .text,
            appearance: .toolbar,
            ariaLabel: 'Back to store',
            onClick: () {},
            // `lab-dir-flip`: points toward the inline start in both directions.
            icon: Transform.flip(
              flipX: Directionality.of(context) == TextDirection.rtl,
              child: const LucideIcon(LucideIcons.arrowLeft),
            ),
          ),
          const Flexible(
            child: Padding(
              padding: EdgeInsets.symmetric(horizontal: 12),
              child: Text(
                'Products',
                maxLines: 1,
                softWrap: false,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
              ),
            ),
          ),
        ],
      ),
      trailing: ToolbarGroup(
        label: 'Product actions',
        children: [
          IconButton(
            variant: .text,
            appearance: .toolbar,
            ariaLabel: 'Export CSV',
            onClick: () {},
            icon: const LucideIcon(LucideIcons.download),
          ),
          IconButton(
            variant: .text,
            appearance: .toolbar,
            ariaLabel: 'More actions',
            onClick: () {},
            icon: const LucideIcon(LucideIcons.moreHorizontal),
          ),
          Button(
            variant: .filled,
            appearance: .toolbar,
            onClick: () {},
            children: const [LucideIcon(LucideIcons.plus), Text('Add product')],
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
