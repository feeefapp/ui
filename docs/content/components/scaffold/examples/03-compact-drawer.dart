import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

const _pages = [
  (label: 'Orders', icon: LucideIcons.shoppingBag),
  (label: 'Products', icon: LucideIcons.package),
  (label: 'Deliveries', icon: LucideIcons.truck),
  (label: 'Customers', icon: LucideIcons.users),
];

class CompactDrawer extends StatefulWidget {
  const CompactDrawer({super.key});

  @override
  State<CompactDrawer> createState() => _CompactDrawerState();
}

class _CompactDrawerState extends State<CompactDrawer> {
  String _page = 'Deliveries';

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    return _Frame(
      child: Scaffold(
        compact: true,
        drawerLabel: 'Store navigation',
        side: Builder(
          builder: (context) {
            final state = Scaffold.of(context);
            return ScaffoldSide(
              leading: const _Brand(),
              child: Semantics(
                container: true,
                label: 'Store pages',
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  spacing: 2,
                  children: [
                    for (final item in _pages)
                      NavigationItem(
                        compact: false,
                        label: item.label,
                        icon: LucideIcon(item.icon),
                        active: _page == item.label,
                        onSelect: () {
                          setState(() => _page = item.label);
                          state.setDrawerOpen(false);
                        },
                      ),
                  ],
                ),
              ),
            );
          },
        ),
        appBar: ScaffoldAppBar(
          leading: const ToolbarGroup(
            label: 'Navigation',
            children: [ScaffoldToggleButton()],
          ),
          child: ToolbarGroup(
            label: 'Current page',
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: Text(
                  _page,
                  maxLines: 1,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          spacing: 8,
          children: [
            for (final row in const [
              'Yalidine · 12 parcels',
              'ZR Express · 8 parcels',
              'Maystro · 3 parcels',
            ])
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 12,
                ),
                decoration: BoxDecoration(
                  color: c.surface,
                  border: Border.all(color: c.line),
                  borderRadius: BorderRadius.circular(theme.sizes.radiusSmall),
                ),
                child: DefaultTextStyle.merge(
                  style: const TextStyle(fontSize: 13),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    spacing: 2,
                    children: [
                      Text(
                        row,
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                      Text(
                        'Picked up today',
                        style: TextStyle(fontSize: 13 / 1.2, color: c.muted),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// `<strong className="scaffold-demo-brand">`.
class _Brand extends StatelessWidget {
  const _Brand();

  @override
  Widget build(BuildContext context) => ConstrainedBox(
    constraints: const BoxConstraints(minHeight: 44),
    child: const Padding(
      padding: EdgeInsetsDirectional.only(start: 10),
      child: Align(
        alignment: AlignmentDirectional.centerStart,
        widthFactor: 1,
        child: Text(
          'Atlas Store',
          style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
        ),
      ),
    ),
  );
}

/// `.scaffold-demo-frame[data-size='phone']`: a bounded, phone-wide box.
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
      alignment: Alignment.center,
      child: Container(
        constraints: const BoxConstraints(maxWidth: 390),
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
      ),
    );
  }
}
