import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

const _customers = [
  'Amina Benali',
  'Yacine Haddad',
  'Sara Meziane',
  'Karim Saidi',
  'Lina Cherif',
  'Omar Belkacem',
];
final _orders = [
  for (var i = 0; i < 24; i++)
    (
      id: 1048 - i,
      customer: _customers[i % 6],
      total: '${(3 + (i % 7)) * 650} DA',
    ),
];

class StoreApp extends StatefulWidget {
  const StoreApp({super.key});

  @override
  State<StoreApp> createState() => _StoreAppState();
}

class _StoreAppState extends State<StoreApp> {
  String _tab = 'orders';
  bool _calling = true;

  @override
  Widget build(BuildContext context) {
    final c = ThemeProvider.of(context).colors;
    return _Device(
      label: 'A phone showing a store app with four tabs',
      child: TabView(
        label: 'Store',
        // Keep this TabView mounted when moving navigation into a wide sidebar.
        // Set showBar: false there; changing the shell must not discard drafts.
        showBar: true,
        value: _tab,
        onChange: (tab) => setState(() => _tab = tab),
        // `.demo-call`: a call in progress as the bar's accessory.
        accessory: _calling
            ? Padding(
                padding: const EdgeInsetsDirectional.only(start: 8),
                child: Row(
                  spacing: 10,
                  children: [
                    LucideIcon(
                      LucideIcons.phoneCall,
                      size: 18,
                      color: c.primary,
                    ),
                    const Expanded(
                      child: Text(
                        'Calling Amina · 02:14',
                        maxLines: 1,
                        softWrap: false,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(fontSize: 14),
                      ),
                    ),
                    Button(
                      variant: .text,
                      appearance: .toolbar,
                      controlSize: .small,
                      onClick: () => setState(() => _calling = false),
                      children: const [Text('End')],
                    ),
                  ],
                ),
              )
            : null,
        tabs: const [
          Tab(
            id: 'orders',
            label: 'Orders',
            icon: LucideIcon(LucideIcons.shoppingBag),
            badge: '8',
            content: _OrdersTab(),
          ),
          Tab(
            id: 'inbox',
            label: 'Inbox',
            icon: LucideIcon(LucideIcons.messageSquare),
            content: _SimpleTab(
              title: 'Inbox',
              rows: ['Amina Benali', 'Yacine Haddad', 'Sara Meziane'],
            ),
          ),
          Tab(
            id: 'products',
            label: 'Products',
            icon: LucideIcon(LucideIcons.package),
            content: _SimpleTab(
              title: 'Products',
              rows: ['Linen kaftan', 'Silk scarf', 'Brass lamp'],
            ),
          ),
          Tab(
            id: 'settings',
            label: 'Settings',
            icon: LucideIcon(LucideIcons.settings),
            content: _SimpleTab(
              title: 'Settings',
              rows: ['Store', 'Couriers', 'Payments', 'Team'],
            ),
          ),
        ],
      ),
    );
  }
}

class _OrdersTab extends StatefulWidget {
  const _OrdersTab();

  @override
  State<_OrdersTab> createState() => _OrdersTabState();
}

class _OrdersTabState extends State<_OrdersTab> {
  final _nav = NavigationPath<int>();

  @override
  void dispose() {
    _nav.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: _nav,
    builder: (context, _) => NavigationStack(
      label: 'Orders',
      onBack: _nav.pop,
      children: [
        NavigationPage(
          key: const ValueKey('orders'),
          title: 'Orders',
          subtitle: const Text('Scroll down: the tab bar steps aside.'),
          child: ListSection(
            header: const Text('Today'),
            children: [
              for (final o in _orders)
                ListRow(
                  key: ValueKey(o.id),
                  chevron: true,
                  leading: const LucideIcon(LucideIcons.package),
                  title: Text('#${o.id} · ${o.customer}'),
                  trailing: Text(o.total),
                  onClick: () => _nav.push(o.id),
                ),
            ],
          ),
        ),
        for (final id in _nav.path)
          NavigationPage(
            key: ValueKey(id),
            title: 'Order #$id',
            child: const ListSection(
              header: Text('Order'),
              children: [
                ListRow(title: Text('Status'), trailing: Text('To confirm')),
                ListRow(title: Text('Courier'), trailing: Text('Yalidine')),
              ],
            ),
          ),
      ],
    ),
  );
}

class _SimpleTab extends StatelessWidget {
  const _SimpleTab({required this.title, required this.rows});
  final String title;
  final List<String> rows;

  @override
  Widget build(BuildContext context) => NavigationStack(
    label: title,
    children: [
      NavigationPage(
        key: const ValueKey('root'),
        title: title,
        child: ListSection(
          children: [
            for (final r in rows)
              ListRow(
                key: ValueKey(r),
                chevron: true,
                title: Text(r),
                onClick: () {},
              ),
          ],
        ),
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
  static const height = 760.0;

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
