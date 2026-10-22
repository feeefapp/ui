import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

const _pages = [
  (label: 'Orders', icon: LucideIcons.shoppingBag),
  (label: 'Products', icon: LucideIcons.package),
  (label: 'Deliveries', icon: LucideIcons.truck),
];

class TopBar extends StatelessWidget {
  const TopBar({super.key});

  @override
  Widget build(BuildContext context) => _Frame(
    child: Scaffold(
      compactBreakpoint: 420,
      defaultSideMode: .hidden,
      side: Builder(
        builder: (context) {
          final state = Scaffold.of(context);
          return ScaffoldSide(
            leading: const Align(
              alignment: AlignmentDirectional.centerStart,
              child: ScaffoldToggleButton(),
            ),
            child: Semantics(
              container: true,
              label: 'Store pages',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                spacing: 2,
                children: [
                  for (final (index, item) in _pages.indexed)
                    NavigationItem(
                      compact:
                          state.sideMode == ScaffoldSideMode.rail &&
                          !state.drawerOpen,
                      label: item.label,
                      icon: LucideIcon(item.icon),
                      active: index == 1,
                      onSelect: () {},
                    ),
                ],
              ),
            ),
          );
        },
      ),
      // The top row only appears while the sidebar is hidden, so its controls are never doubled.
      topSide: Builder(
        builder: (context) {
          if (Scaffold.of(context).sideMode != ScaffoldSideMode.hidden) {
            return const SizedBox.shrink();
          }
          final rtl = Directionality.of(context) == TextDirection.rtl;
          return ScaffoldTopBar(
            leading: ToolbarGroup(
              label: 'Navigation',
              children: [
                IconButton(
                  variant: .text,
                  appearance: .toolbar,
                  controlSize: .compact,
                  ariaLabel: 'Back to products',
                  onClick: () {},
                  icon: Transform.flip(
                    flipX: rtl,
                    child: const LucideIcon(LucideIcons.arrowLeft),
                  ),
                ),
                const ScaffoldToggleButton(action: .restore),
              ],
            ),
            child: const Text(
              'Atlas Store',
              style: TextStyle(fontWeight: FontWeight.w700),
            ),
          );
        },
      ),
      child: const Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 8,
        children: [
          Padding(
            padding: EdgeInsets.only(bottom: 4),
            child: Text(
              'Edit product',
              style: TextStyle(
                fontSize: 18,
                height: 20 / 18,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Text(
            'Focused editors start with the sidebar hidden. The top row brings it back.',
          ),
        ],
      ),
    ),
  );
}

/// `.scaffold-demo-frame`: a scaffold fills its parent, so the demo gets a bounded box.
class _Frame extends StatelessWidget {
  const _Frame({required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final radius = BorderRadius.circular(theme.sizes.radiusPanel);
    return Container(
      width: double.infinity,
      height: 420,
      foregroundDecoration: BoxDecoration(
        border: Border.all(color: theme.colors.line),
        borderRadius: radius,
      ),
      decoration: BoxDecoration(
        color: theme.colors.ground,
        borderRadius: radius,
      ),
      clipBehavior: Clip.antiAlias,
      child: Padding(padding: const EdgeInsets.all(1), child: child),
    );
  }
}
