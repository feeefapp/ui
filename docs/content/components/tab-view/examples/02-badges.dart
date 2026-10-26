import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

const _toConfirm = [
  'Amina Benali',
  'Yacine Haddad',
  'Sara Meziane',
  'Karim Saidi',
  'Lina Cherif',
];

class Badges extends StatefulWidget {
  const Badges({super.key});

  @override
  State<Badges> createState() => _BadgesState();
}

class _BadgesState extends State<Badges> {
  String _tab = 'orders';
  List<String> _orders = _toConfirm;

  @override
  Widget build(BuildContext context) => _Device(
    label: 'A phone whose tab bar counts what needs action',
    child: TabView(
      label: 'Store',
      value: _tab,
      onChange: (tab) => setState(() => _tab = tab),
      tabs: [
        Tab(
          id: 'orders',
          label: 'Orders',
          icon: const LucideIcon(LucideIcons.shoppingBag),
          badge: _orders.isEmpty ? null : '${_orders.length}',
          content: _Page(
            title: 'To confirm',
            subtitle: 'Confirm an order: the badge counts down.',
            child: ListSection(
              children: [
                for (final name in _orders)
                  ListRow(
                    key: ValueKey(name),
                    leading: const LucideIcon(LucideIcons.package),
                    title: Text(name),
                    trailing: const Text('Confirm'),
                    onClick: () => setState(
                      () => _orders = [
                        for (final n in _orders)
                          if (n != name) n,
                      ],
                    ),
                  ),
                if (_orders.isEmpty)
                  const ListRow(title: Text('Every order is confirmed')),
              ],
            ),
          ),
        ),
        const Tab(
          id: 'inbox',
          label: 'Inbox',
          icon: LucideIcon(LucideIcons.messageSquare),
          badge: '3',
          content: _Page(
            title: 'Inbox',
            child: _Rows(['Amina Benali', 'Omar Belkacem', 'Sara Meziane']),
          ),
        ),
        const Tab(
          id: 'products',
          label: 'Products',
          icon: LucideIcon(LucideIcons.package),
          content: _Page(
            title: 'Products',
            child: _Rows(['Linen kaftan', 'Silk scarf', 'Brass lamp']),
          ),
        ),
        const Tab(
          id: 'settings',
          label: 'Settings',
          icon: LucideIcon(LucideIcons.settings),
          content: _Page(
            title: 'Settings',
            child: _Rows(['Store', 'Couriers', 'Payments']),
          ),
        ),
      ],
    ),
  );
}

class _Page extends StatelessWidget {
  const _Page({required this.title, this.subtitle, required this.child});
  final String title;
  final String? subtitle;
  final Widget child;

  @override
  Widget build(BuildContext context) => NavigationStack(
    label: title,
    children: [
      NavigationPage(
        key: const ValueKey('root'),
        title: title,
        subtitle: subtitle == null ? null : Text(subtitle!),
        child: child,
      ),
    ],
  );
}

class _Rows extends StatelessWidget {
  const _Rows(this.rows);
  final List<String> rows;

  @override
  Widget build(BuildContext context) => ListSection(
    children: [
      for (final r in rows)
        ListRow(
          key: ValueKey(r),
          chevron: true,
          title: Text(r),
          onClick: () {},
        ),
    ],
  );
}

/// The docs' pretend phone (docs/src/blocks/device.tsx): lays [child] out at a real phone size and
/// scales the screen down to fit the column, centred.
class _Device extends StatelessWidget {
  const _Device({required this.label, required this.child});
  final String label;
  final Widget child;

  static const _width = 390.0;
  // `<Device height={480}>`.
  static const height = 480.0;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    return LayoutBuilder(
      builder: (context, constraints) {
        final available = constraints.maxWidth;
        final scale = available.isFinite
            ? (available / _width).clamp(0.0, 1.0)
            : 1.0;
        final radius = BorderRadius.circular(44 * theme.config.radiusScale);
        return SizedBox(
          width: available.isFinite ? available : _width,
          height: (height * scale).roundToDouble(),
          child: Center(
            child: Semantics(
              container: true,
              label: label,
              child: Transform.scale(
                scale: scale,
                child: OverflowBox(
                  minWidth: _width,
                  maxWidth: _width,
                  minHeight: height,
                  maxHeight: height,
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      borderRadius: radius,
                      boxShadow: const [
                        BoxShadow(
                          color: Color(0x59000000),
                          offset: Offset(0, 24),
                          blurRadius: 51,
                          spreadRadius: -32,
                        ),
                      ],
                    ),
                    child: ClipRRect(
                      borderRadius: radius,
                      child: ColoredBox(
                        color: theme.colors.ground,
                        child: child,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
