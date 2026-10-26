import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

const _pages = [
  (label: 'Orders', href: '/orders', icon: LucideIcons.shoppingBag),
  (label: 'Products', href: '/products', icon: LucideIcons.package),
  (label: 'Deliveries', href: '/deliveries', icon: LucideIcons.truck),
];

class Links extends StatefulWidget {
  const Links({super.key});

  @override
  State<Links> createState() => _LinksState();
}

class _LinksState extends State<Links> {
  String _path = '/orders';

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    return SizedBox(
      width: double.infinity,
      // `.nav-demo-layout`
      child: Wrap(
        spacing: 16,
        runSpacing: 16,
        alignment: WrapAlignment.center,
        children: [
          Semantics(
            container: true,
            label: 'Store',
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
                children: [
                  for (final item in _pages)
                    NavigationItem(
                      compact: false,
                      label: item.label,
                      icon: LucideIcon(item.icon),
                      href: item.href,
                      active: _path == item.href,
                      // Flutter has no browser navigation: route on select.
                      onSelect: () => setState(() => _path = item.href),
                    ),
                ],
              ),
            ),
          ),
          Semantics(
            liveRegion: true,
            child: Text(
              'Current path: $_path',
              style: TextStyle(color: c.muted, fontSize: 13),
            ),
          ),
        ],
      ),
    );
  }
}
