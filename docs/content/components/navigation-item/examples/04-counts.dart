import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class Counts extends StatefulWidget {
  const Counts({super.key});

  @override
  State<Counts> createState() => _CountsState();
}

class _CountsState extends State<Counts> {
  String _page = 'Orders';

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final pages = [
      (
        label: 'Orders',
        icon: LucideIcons.shoppingBag,
        trailing: const Text('12') as Widget?,
      ),
      (
        label: 'Deliveries',
        icon: LucideIcons.truck,
        trailing: const Text('3') as Widget?,
      ),
      (label: 'Products', icon: LucideIcons.package, trailing: null),
      (
        label: 'Inbox',
        icon: LucideIcons.inbox,
        // `.lab-dir-flip`: the chevron points to the reading end.
        trailing: Transform.flip(
          flipX: Directionality.of(context) == TextDirection.rtl,
          child: const LucideIcon(LucideIcons.chevronRight),
        ) as Widget?,
      ),
    ];
    return Semantics(
      container: true,
      label: 'Store',
      child: Container(
        // `.nav-demo-side`: a 260px sidebar stand-in.
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
            for (final item in pages)
              NavigationItem(
                compact: false,
                label: item.label,
                icon: LucideIcon(item.icon),
                trailing: item.trailing,
                active: _page == item.label,
                onSelect: () => setState(() => _page = item.label),
              ),
          ],
        ),
      ),
    );
  }
}
