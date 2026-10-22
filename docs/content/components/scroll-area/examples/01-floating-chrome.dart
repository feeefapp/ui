import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

final _products = [
  for (final (i, name) in [
    'Wireless earbuds',
    'Phone case',
    'Smart watch',
    'Power bank 20 000 mAh',
    'USB-C cable',
    'Bluetooth speaker',
    'Laptop stand',
    'Desk lamp',
    'Car charger',
    'Ring light',
    'Gaming mouse',
    'Keyboard',
  ].indexed)
    (name: name, price: '${(i + 2) * 850} DA', stock: 40 - i * 3),
];

class FloatingChrome extends StatefulWidget {
  const FloatingChrome({super.key});

  @override
  State<FloatingChrome> createState() => _FloatingChromeState();
}

class _FloatingChromeState extends State<FloatingChrome> {
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final rows = _products
        .where((p) => p.name.toLowerCase().contains(_query.toLowerCase()))
        .toList();
    return _ScrollDemoFrame(
      child: ScrollArea(
        label: 'Products',
        top: ToolbarSearch(
          label: 'Search products',
          value: _query,
          onValueChange: (value) => setState(() => _query = value),
          trailing: ToolbarGroup(
            label: 'Product count',
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: Text(
                  '${rows.length} products',
                  softWrap: false,
                  style: const TextStyle(fontSize: 13),
                ),
              ),
            ],
          ),
        ),
        bottom: Dock(
          label: 'Product actions',
          children: [
            Button(
              variant: .filled,
              onClick: () {},
              children: const [
                LucideIcon(LucideIcons.plus),
                Text('Add product'),
              ],
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          spacing: 8,
          children: [
            for (final product in rows)
              _ScrollDemoRow(
                title: product.name,
                detail: '${product.stock} in stock',
                trailing: product.price,
              ),
          ],
        ),
      ),
    );
  }
}

/// `.scroll-demo-frame`: the bordered surface the area fills.
class _ScrollDemoFrame extends StatelessWidget {
  const _ScrollDemoFrame({required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final radius = BorderRadius.circular(theme.sizes.radiusPanel);
    return Container(
      width: double.infinity,
      height: 380,
      decoration: BoxDecoration(
        color: c.surface,
        border: Border.all(color: c.line),
        borderRadius: radius,
      ),
      child: ClipRRect(borderRadius: radius, child: child),
    );
  }
}

/// `.scroll-demo-row`: a bordered list row with a title, a detail and a trailing value.
class _ScrollDemoRow extends StatelessWidget {
  const _ScrollDemoRow({
    required this.title,
    required this.detail,
    this.trailing,
  });
  final String title, detail;
  final String? trailing;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 14),
      decoration: BoxDecoration(
        color: c.surface,
        border: Border.all(color: c.line),
        borderRadius: BorderRadius.circular(theme.sizes.radiusSmall),
      ),
      child: DefaultTextStyle.merge(
        style: const TextStyle(fontSize: 13),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          spacing: 12,
          children: [
            Flexible(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                spacing: 2,
                children: [
                  Text(
                    title,
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  // `<small>`: 0.833em.
                  Text(
                    detail,
                    style: TextStyle(color: c.muted, fontSize: 13 * 0.833),
                  ),
                ],
              ),
            ),
            if (trailing != null)
              Text(
                trailing!,
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
          ],
        ),
      ),
    );
  }
}
