import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

const _pages = [
  (label: 'Orders', icon: LucideIcons.shoppingBag),
  (label: 'Products', icon: LucideIcons.package),
  (label: 'Deliveries', icon: LucideIcons.truck),
  (label: 'Customers', icon: LucideIcons.users),
];

const _orders = [
  (id: '#1048', customer: 'Amina Benali', city: 'Alger', total: '4 500 DA'),
  (id: '#1047', customer: 'Yacine Haddad', city: 'Oran', total: '2 900 DA'),
  (
    id: '#1046',
    customer: 'Sara Meziane',
    city: 'Constantine',
    total: '7 200 DA',
  ),
  (id: '#1045', customer: 'Karim Saidi', city: 'Blida', total: '3 100 DA'),
  (id: '#1044', customer: 'Lina Cherif', city: 'Sétif', total: '5 650 DA'),
  (id: '#1043', customer: 'Omar Belkacem', city: 'Annaba', total: '1 800 DA'),
];

class Workspace extends StatefulWidget {
  const Workspace({super.key});

  @override
  State<Workspace> createState() => _WorkspaceState();
}

class _WorkspaceState extends State<Workspace> {
  String _page = 'Orders';

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    return _Frame(
      // The demo frame is a small page, so it switches to the drawer below 560px instead of 720px.
      child: Scaffold(
        contentLabel: _page,
        compactBreakpoint: 560,
        // Slots read the scaffold state: here the sidebar knows when it is a rail.
        side: Builder(
          builder: (context) {
            final state = Scaffold.of(context);
            final rail =
                state.sideMode == ScaffoldSideMode.rail && !state.drawerOpen;
            return ScaffoldSide(
              leading: ConstrainedBox(
                constraints: const BoxConstraints(minHeight: 44),
                child: Padding(
                  padding: const EdgeInsetsDirectional.only(start: 10),
                  child: Row(
                    spacing: 8,
                    children: [
                      if (!rail)
                        const Expanded(
                          child: Text(
                            'Atlas Store',
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        )
                      else
                        const Spacer(),
                      if (!state.drawerOpen) const ScaffoldToggleButton(),
                    ],
                  ),
                ),
              ),
              child: Semantics(
                container: true,
                label: 'Store pages',
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  spacing: 2,
                  children: [
                    for (final item in _pages)
                      NavigationItem(
                        compact: rail,
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
        appBar: Builder(
          builder: (context) {
            final state = Scaffold.of(context);
            return ScaffoldAppBar(
              leading:
                  state.compact || state.sideMode == ScaffoldSideMode.hidden
                  ? const ToolbarGroup(
                      label: 'Navigation',
                      children: [ScaffoldToggleButton()],
                    )
                  : null,
              trailing: ToolbarGroup(
                label: 'Page actions',
                children: [
                  IconButton(
                    variant: .text,
                    appearance: .toolbar,
                    controlSize: .compact,
                    ariaLabel: 'Search orders',
                    onClick: () {},
                    icon: const LucideIcon(LucideIcons.search),
                  ),
                ],
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
            );
          },
        ),
        bottom: Dock(
          label: 'Order actions',
          children: [
            Button(
              variant: .filled,
              onClick: () {},
              children: const [LucideIcon(LucideIcons.plus), Text('New order')],
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          spacing: 8,
          children: [
            for (final order in _orders)
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
                  child: Row(
                    spacing: 12,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          spacing: 2,
                          children: [
                            Text(
                              '${order.id} · ${order.customer}',
                              style: const TextStyle(
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            Text(
                              '${order.city} · Cash on delivery',
                              style: TextStyle(
                                fontSize: 13 / 1.2,
                                color: c.muted,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Text(
                        order.total,
                        style: const TextStyle(fontWeight: FontWeight.w700),
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
