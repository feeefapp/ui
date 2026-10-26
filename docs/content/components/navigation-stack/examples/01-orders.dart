import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

const _orders = [
  (
    id: 1048,
    customer: 'Amina Benali',
    city: 'Alger',
    total: '4 500 DA',
    items: 3,
  ),
  (
    id: 1047,
    customer: 'Yacine Haddad',
    city: 'Oran',
    total: '2 900 DA',
    items: 1,
  ),
  (
    id: 1046,
    customer: 'Sara Meziane',
    city: 'Constantine',
    total: '7 200 DA',
    items: 4,
  ),
  (
    id: 1045,
    customer: 'Karim Saidi',
    city: 'Blida',
    total: '3 100 DA',
    items: 2,
  ),
  (
    id: 1044,
    customer: 'Lina Cherif',
    city: 'Sétif',
    total: '5 650 DA',
    items: 2,
  ),
  (
    id: 1043,
    customer: 'Omar Belkacem',
    city: 'Annaba',
    total: '1 800 DA',
    items: 1,
  ),
  (
    id: 1042,
    customer: 'Nour Hamidi',
    city: 'Tlemcen',
    total: '6 300 DA',
    items: 5,
  ),
  (
    id: 1041,
    customer: 'Riad Boudjema',
    city: 'Béjaïa',
    total: '2 450 DA',
    items: 1,
  ),
];

typedef _Route = ({String page, int id});

class OrdersStack extends StatefulWidget {
  const OrdersStack({super.key});

  @override
  State<OrdersStack> createState() => _OrdersStackState();
}

class _OrdersStackState extends State<OrdersStack> {
  final _nav = NavigationPath<_Route>();

  @override
  void dispose() {
    _nav.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => _Device(
    label: 'A phone showing the orders stack',
    child: ListenableBuilder(
      listenable: _nav,
      builder: (context, _) => NavigationStack(
        label: 'Orders',
        onBack: _nav.pop,
        children: [
          NavigationPage(
            key: const ValueKey('orders'),
            title: 'Orders',
            subtitle: const Text('8 waiting for confirmation'),
            child: ListSection(
              header: const Text('Today'),
              children: [
                for (final order in _orders)
                  ListRow(
                    key: ValueKey(order.id),
                    chevron: true,
                    leading: const LucideIcon(LucideIcons.package),
                    title: Text('#${order.id} · ${order.customer}'),
                    subtitle: Text('${order.city} · ${order.items} items'),
                    trailing: Text(order.total),
                    onClick: () => _nav.push((page: 'order', id: order.id)),
                  ),
              ],
            ),
          ),
          for (final route in _nav.path) _page(route),
        ],
      ),
    ),
  );

  Widget _page(_Route route) {
    final order = _orders.firstWhere((o) => o.id == route.id);
    if (route.page == 'order') {
      return NavigationPage(
        key: ValueKey('order-${order.id}'),
        title: 'Order #${order.id}',
        trailing: ToolbarGroup(
          label: 'Order actions',
          children: [
            IconButton(
              variant: .text,
              appearance: .toolbar,
              ariaLabel: 'More order actions',
              onClick: () {},
              icon: const LucideIcon(LucideIcons.ellipsis),
            ),
          ],
        ),
        bottom: Dock(
          label: 'Order actions',
          children: [
            Button(
              variant: .tonal,
              onClick: () {},
              children: const [LucideIcon(LucideIcons.phone), Text('Call')],
            ),
            Button(
              variant: .filled,
              onClick: () {},
              children: const [Text('Confirm order')],
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          // Sections keep 24px between them (.lab-list-section margin).
          spacing: 24,
          children: [
            ListSection(
              header: const Text('Customer'),
              children: [
                ListRow(
                  chevron: true,
                  leading: const LucideIcon(LucideIcons.user),
                  title: Text(order.customer),
                  subtitle: const Text('0555 12 34 56'),
                  onClick: () => _nav.push((page: 'customer', id: order.id)),
                ),
                ListRow(
                  leading: const LucideIcon(LucideIcons.mapPin),
                  title: Text(order.city),
                  subtitle: const Text('Home delivery'),
                ),
              ],
            ),
            ListSection(
              header: const Text('Order'),
              footer: const Text(
                'Swipe right anywhere on this page to go back.',
              ),
              children: [
                ListRow(
                  title: const Text('Items'),
                  trailing: Text('${order.items}'),
                ),
                const ListRow(
                  leading: LucideIcon(LucideIcons.truck),
                  title: Text('Courier'),
                  trailing: Text('Yalidine'),
                ),
                ListRow(
                  title: const Text('Total'),
                  trailing: Text(order.total),
                ),
              ],
            ),
          ],
        ),
      );
    }
    return NavigationPage(
      key: ValueKey('customer-${order.id}'),
      title: order.customer,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 24,
        children: [
          ListSection(
            header: const Text('Contact'),
            children: [
              const ListRow(
                leading: LucideIcon(LucideIcons.phone),
                title: Text('0555 12 34 56'),
                subtitle: Text('Mobile'),
              ),
              ListRow(
                leading: const LucideIcon(LucideIcons.mapPin),
                title: Text(order.city),
                subtitle: const Text('Delivery address'),
              ),
            ],
          ),
          const ListSection(
            header: Text('History'),
            children: [
              ListRow(title: Text('Orders'), trailing: Text('6')),
              ListRow(title: Text('Delivered'), trailing: Text('5')),
              ListRow(title: Text('Returned'), trailing: Text('1')),
            ],
          ),
        ],
      ),
    );
  }
}

/// The docs' pretend phone (docs/src/blocks/device.tsx): a 390 × 760 screen, scaled down to fit
/// the column, centred, with rounded corners and a soft shadow.
class _Device extends StatelessWidget {
  const _Device({required this.label, required this.child});
  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    const width = 390.0, height = 760.0;
    final radius = BorderRadius.circular(44 * theme.config.radiusScale);
    return LayoutBuilder(
      builder: (context, constraints) {
        final available = constraints.maxWidth;
        final scale = available < width ? available / width : 1.0;
        return SizedBox(
          width: available,
          height: (height * scale).roundToDouble(),
          child: Align(
            alignment: Alignment.topCenter,
            child: SizedBox(
              width: width * scale,
              height: height * scale,
              child: FittedBox(
                fit: BoxFit.fill,
                child: Semantics(
                  container: true,
                  label: label,
                  child: Container(
                    width: width,
                    height: height,
                    decoration: BoxDecoration(
                      color: theme.colors.ground,
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
                    child: ClipRRect(borderRadius: radius, child: child),
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
