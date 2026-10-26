import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

const _main = [
  (label: 'Orders', icon: LucideIcons.shoppingBag),
  (label: 'Products', icon: LucideIcons.package),
  (label: 'Deliveries', icon: LucideIcons.truck),
  (label: 'Customers', icon: LucideIcons.users),
];
const _more = [
  (label: 'Analytics', icon: LucideIcons.chartColumn),
  (label: 'Settings', icon: LucideIcons.settings),
];

class Sidebar extends StatefulWidget {
  const Sidebar({super.key});

  @override
  State<Sidebar> createState() => _SidebarState();
}

class _SidebarState extends State<Sidebar> {
  String _page = 'Orders';

  Widget _item(({String label, LucideIconData icon}) item) => NavigationItem(
    compact: false,
    label: item.label,
    icon: LucideIcon(item.icon),
    active: _page == item.label,
    onSelect: () => setState(() => _page = item.label),
  );

  @override
  Widget build(BuildContext context) {
    final c = ThemeProvider.of(context).colors;
    return _NavDemoSide(
      label: 'Store',
      children: [
        ..._main.map(_item),
        Padding(
          padding: const EdgeInsets.fromLTRB(8, 8, 8, 4),
          child: Text(
            'STORE',
            style: TextStyle(
              color: c.muted,
              fontSize: 11,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.44,
            ),
          ),
        ),
        ..._more.map(_item),
      ],
    );
  }
}

/// `.nav-demo-side`: a 260px sidebar stand-in.
class _NavDemoSide extends StatelessWidget {
  const _NavDemoSide({required this.label, required this.children});
  final String label;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    return Semantics(
      container: true,
      label: label,
      child: Container(
        width: 260,
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: Color.lerp(c.ground, c.primary, 0.03),
          border: Border.all(color: c.line),
          borderRadius: BorderRadius.circular(theme.sizes.radiusPanel),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          spacing: 2,
          children: children,
        ),
      ),
    );
  }
}
