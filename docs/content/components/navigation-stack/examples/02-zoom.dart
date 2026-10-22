import 'dart:math' as math;

import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

const _products = [
  (id: 'kaftan', name: 'Linen kaftan', price: '6 800 DA', hue: 28.0),
  (id: 'babouche', name: 'Leather babouches', price: '3 200 DA', hue: 12.0),
  (id: 'tote', name: 'Woven tote', price: '2 400 DA', hue: 48.0),
  (id: 'scarf', name: 'Silk scarf', price: '1 900 DA', hue: 330.0),
  (id: 'mug', name: 'Clay mug set', price: '2 100 DA', hue: 190.0),
  (id: 'lamp', name: 'Brass lamp', price: '9 500 DA', hue: 40.0),
];

class ZoomGallery extends StatefulWidget {
  const ZoomGallery({super.key});

  @override
  State<ZoomGallery> createState() => _ZoomGalleryState();
}

class _ZoomGalleryState extends State<ZoomGallery> {
  final _nav = NavigationPath<String>();

  @override
  void dispose() {
    _nav.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => _Device(
    label: 'A phone showing a product gallery with zoom transitions',
    child: ListenableBuilder(
      listenable: _nav,
      builder: (context, _) => NavigationStack(
        label: 'Products',
        onBack: _nav.pop,
        children: [
          NavigationPage(
            key: const ValueKey('products'),
            title: 'Products',
            subtitle: const Text(
              'Tap a product. Drag its page down to put it back.',
            ),
            child: _Grid(
              children: [
                for (final product in _products)
                  _Card(product: product, onTap: () => _nav.push(product.id)),
              ],
            ),
          ),
          for (final id in _nav.path) _page(context, id),
        ],
      ),
    ),
  );

  Widget _page(BuildContext context, String id) {
    final product = _products.firstWhere((p) => p.id == id);
    final c = ThemeProvider.of(context).colors;
    return NavigationPage(
      key: ValueKey(id),
      title: product.name,
      zoomSource: id,
      contentPadding: 0,
      trailing: ToolbarGroup(
        label: 'Product actions',
        children: [
          IconButton(
            variant: .text,
            appearance: .toolbar,
            ariaLabel: 'Save',
            onClick: () {},
            icon: const LucideIcon(LucideIcons.heart),
          ),
          IconButton(
            variant: .text,
            appearance: .toolbar,
            ariaLabel: 'Share',
            onClick: () {},
            icon: const LucideIcon(LucideIcons.share),
          ),
        ],
      ),
      bottom: Dock(
        label: 'Buy',
        children: [
          Button(
            variant: .filled,
            onClick: () {},
            children: [Text('Order · ${product.price}')],
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(height: 420, child: _Art(hue: product.hue)),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Text(
                    product.name,
                    // `.stack-demo-body h2` under the kit's heading rule: line-height
                    // round(1.12em, 1px), -0.035em.
                    style: const TextStyle(
                      fontSize: 24,
                      height: 27 / 24,
                      leadingDistribution: TextLeadingDistribution.even,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 24 * -0.035,
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.only(bottom: 20),
                  child: Text(
                    'Handmade in small batches. Cash on delivery to all 58 '
                    'wilayas, delivered in two to four days.',
                    style: TextStyle(
                      color: c.muted,
                      fontSize: 15,
                      height: 23 / 15,
                      leadingDistribution: TextLeadingDistribution.even,
                    ),
                  ),
                ),
                ListSection(
                  header: const Text('Details'),
                  children: [
                    ListRow(
                      title: const Text('Price'),
                      trailing: Text(product.price),
                    ),
                    const ListRow(
                      title: Text('In stock'),
                      trailing: Text('14'),
                    ),
                    const ListRow(
                      title: Text('Delivery'),
                      trailing: Text('2–4 days'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// `.stack-demo-grid`: two equal columns, 12px gaps.
class _Grid extends StatelessWidget {
  const _Grid({required this.children});
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    spacing: 12,
    children: [
      for (var i = 0; i < children.length; i += 2)
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          spacing: 12,
          children: [
            Expanded(child: children[i]),
            Expanded(
              child: i + 1 < children.length
                  ? children[i + 1]
                  : const SizedBox.shrink(),
            ),
          ],
        ),
    ],
  );
}

/// `.stack-demo-card`: the art the page zooms out of, the name and the price.
class _Card extends StatelessWidget {
  const _Card({required this.product, required this.onTap});
  final ({String id, String name, String price, double hue}) product;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    const text = TextStyle(
      height: 1.6,
      leadingDistribution: TextLeadingDistribution.even,
    );
    return Semantics(
      button: true,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: FocusableActionDetector(
          actions: {
            ActivateIntent: CallbackAction<ActivateIntent>(
              onInvoke: (_) {
                onTap();
                return null;
              },
            ),
          },
          child: Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              spacing: 4,
              children: [
                // The page zooms out of this element and shrinks back into it.
                ZoomSource(
                  id: product.id,
                  radius: 18 * theme.config.radiusScale,
                  child: AspectRatio(
                    aspectRatio: 4 / 5,
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(
                        18 * theme.config.radiusScale,
                      ),
                      child: _Art(hue: product.hue),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(
                    product.name,
                    style: text.copyWith(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: theme.colors.ink,
                    ),
                  ),
                ),
                Text(
                  product.price,
                  style: text.copyWith(fontSize: 13, color: theme.colors.muted),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// `linear-gradient(135deg, hsl(h 70% 72%), hsl(h+40 55% 46%))`, with the CSS gradient line: at
/// 135° and long enough that the corners sit on 0% and 100%.
class _Art extends StatelessWidget {
  const _Art({required this.hue});
  final double hue;

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) {
      final w = constraints.maxWidth, h = constraints.maxHeight;
      final half = (w + h) * math.sqrt1_2 / 2;
      final dx = half * math.sqrt1_2, dy = half * math.sqrt1_2;
      return DecoratedBox(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment(-dx / (w / 2), -dy / (h / 2)),
            end: Alignment(dx / (w / 2), dy / (h / 2)),
            colors: [
              HSLColor.fromAHSL(1, hue % 360, 0.7, 0.72).toColor(),
              HSLColor.fromAHSL(1, (hue + 40) % 360, 0.55, 0.46).toColor(),
            ],
          ),
        ),
      );
    },
  );
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
