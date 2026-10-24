import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

const _cities = ['Alger', 'Oran', 'Constantine', 'Blida', 'Sétif'];

({int id, String city, String total}) _order(int id) => (
  id: id,
  city: _cities[id % _cities.length],
  total: '${((id % 7) + 2) * 1450} DA',
);

class Orders extends StatefulWidget {
  const Orders({super.key});

  @override
  State<Orders> createState() => _OrdersState();
}

class _OrdersState extends State<Orders> {
  final refresh = RefreshController();
  var orders = [for (var i = 0; i < 10; i++) _order(1060 - i)];

  @override
  void dispose() {
    refresh.dispose();
    super.dispose();
  }

  // Your fetch goes here; the loader stays until the future completes.
  Future<void> load() async {
    await Future<void>.delayed(const Duration(milliseconds: 1500));
    if (!mounted) return;
    setState(() => orders = [_order(orders.first.id + 1), ...orders]);
  }

  @override
  Widget build(BuildContext context) => _PullDemoFrame(
    child: ScrollArea(
      label: 'New orders',
      onRefresh: load,
      refreshController: refresh,
      top: Toolbar(
        label: 'Order tools',
        leading: const ToolbarGroup(
          label: 'Title',
          children: [
            Padding(
              padding: EdgeInsets.symmetric(horizontal: 12),
              child: Text(
                'New orders',
                softWrap: false,
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
        trailing: ToolbarGroup(
          label: 'Actions',
          children: [
            // Not everyone can pull: the same refresh from a button.
            IconButton(
              ariaLabel: 'Refresh',
              appearance: .toolbar,
              onClick: refresh.refresh,
              icon: const LucideIcon(LucideIcons.refreshCw),
            ),
          ],
        ),
      ),
      child: ListSection(
        children: [
          for (final item in orders)
            ListRow(
              chevron: true,
              title: Text('Order #${item.id}'),
              subtitle: Text('${item.city} · cash on delivery'),
              trailing: Text(item.total),
              onClick: () {},
            ),
        ],
      ),
    ),
  );
}

/// `.pull-demo-frame`: a phone-sized bordered surface the area fills.
class _PullDemoFrame extends StatelessWidget {
  const _PullDemoFrame({required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final radius = BorderRadius.circular(theme.sizes.radiusPanel);
    return Container(
      width: 360,
      height: 420,
      decoration: BoxDecoration(
        color: c.surface,
        border: Border.all(color: c.line),
        borderRadius: radius,
      ),
      child: ClipRRect(borderRadius: radius, child: child),
    );
  }
}
