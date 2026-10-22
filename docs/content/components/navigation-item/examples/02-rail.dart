import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

const _pages = [
  (label: 'Orders', icon: LucideIcons.shoppingBag),
  (label: 'Products', icon: LucideIcons.package),
  (label: 'Deliveries', icon: LucideIcons.truck),
  (label: 'Customers', icon: LucideIcons.users),
];

class Rail extends StatefulWidget {
  const Rail({super.key});

  @override
  State<Rail> createState() => _RailState();
}

class _RailState extends State<Rail> {
  String _page = 'Products';
  bool _compact = true;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final s = theme.sizes;
    return SizedBox(
      width: double.infinity,
      // `.nav-demo-layout`: the sidebar and the switch side by side, wrapping, centred.
      child: Wrap(
        spacing: 16,
        runSpacing: 16,
        alignment: WrapAlignment.center,
        children: [
          Semantics(
            container: true,
            label: 'Store',
            child: Container(
              // `.nav-demo-side[data-compact='true']`: one rail button wide.
              width: _compact ? s.rowHeight + 22 : 260,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Color.lerp(c.ground, c.primary, 0.03),
                border: Border.all(color: c.line),
                borderRadius: BorderRadius.circular(s.radiusPanel),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                spacing: 2,
                children: [
                  for (final item in _pages)
                    NavigationItem(
                      compact: _compact,
                      label: item.label,
                      icon: LucideIcon(item.icon),
                      active: _page == item.label,
                      onSelect: () => setState(() => _page = item.label),
                    ),
                ],
              ),
            ),
          ),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            alignment: WrapAlignment.center,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              const ExcludeSemantics(child: Text('Rail')),
              SlideSwitch(
                label: 'Rail',
                checked: _compact,
                onCheckedChange: (value) => setState(() => _compact = value),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
