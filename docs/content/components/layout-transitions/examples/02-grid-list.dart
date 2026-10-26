import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

const _products = [
  (id: 'kaftan', name: 'Linen kaftan', hue: 28.0),
  (id: 'babouche', name: 'Leather babouches', hue: 12.0),
  (id: 'tote', name: 'Woven tote', hue: 48.0),
  (id: 'scarf', name: 'Silk scarf', hue: 330.0),
  (id: 'mug', name: 'Clay mug set', hue: 190.0),
  (id: 'lamp', name: 'Brass lamp', hue: 40.0),
];

enum _View { grid, list }

class GridOrList extends StatefulWidget {
  const GridOrList({super.key});

  @override
  State<GridOrList> createState() => _GridOrListState();
}

class _GridOrListState extends State<GridOrList> {
  _View _view = _View.grid;

  @override
  Widget build(BuildContext context) {
    final grid = _view == _View.grid;
    final tiles = [for (final p in _products) _Product(product: p, grid: grid)];
    return SizedBox(
      width: double.infinity,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 16,
        children: [
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: GlassScope(
              child: ToolbarGroup(
                label: 'View',
                children: [
                  SegmentedControl<_View>(
                    label: 'View',
                    value: _view,
                    onChange: (view) => setState(() => _view = view),
                    options: const [
                      SegmentOption(
                        value: _View.grid,
                        label: 'Grid',
                        icon: LucideIcon(LucideIcons.layoutGrid, size: 16),
                      ),
                      SegmentOption(
                        value: _View.list,
                        label: 'List',
                        icon: LucideIcon(LucideIcons.list, size: 16),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          LayoutGroup(
            layoutKey: _view,
            child: grid
                ? Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    spacing: 12,
                    children: [
                      for (var row = 0; row < tiles.length; row += 3)
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          spacing: 12,
                          children: [
                            for (final tile in tiles.skip(row).take(3))
                              Expanded(child: tile),
                          ],
                        ),
                    ],
                  )
                : Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    spacing: 8,
                    children: tiles,
                  ),
          ),
        ],
      ),
    );
  }
}

/// layout-demo.css `.lt-product`.
class _Product extends StatelessWidget {
  const _Product({required this.product, required this.grid});
  final ({String id, String name, double hue}) product;
  final bool grid;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    // `linear-gradient(135deg, …)` corner to corner through the box's own diagonal angle.
    final reach = grid ? const Alignment(0.875, 7 / 6) : Alignment.bottomRight;
    // size: true: the swatch grows and shrinks as well as moving.
    final swatch = LayoutGroupItem(
      layoutId: 'swatch-${product.id}',
      size: true,
      child: AspectRatio(
        aspectRatio: grid ? 4 / 3 : 1,
        child: DecoratedBox(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(
              (grid ? 16 : 12) * theme.config.radiusScale,
            ),
            gradient: LinearGradient(
              begin: -reach,
              end: reach,
              colors: [
                HSLColor.fromAHSL(1, product.hue, 0.70, 0.72).toColor(),
                HSLColor.fromAHSL(
                  1,
                  (product.hue + 40) % 360,
                  0.55,
                  0.46,
                ).toColor(),
              ],
            ),
          ),
        ),
      ),
    );
    final name = Align(
      alignment: AlignmentDirectional.centerStart,
      child: LayoutGroupItem(
        layoutId: 'name-${product.id}',
        child: Text(
          product.name,
          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
        ),
      ),
    );
    return grid
        ? Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: 6,
            children: [swatch, name],
          )
        : Row(
            spacing: 12,
            children: [
              SizedBox(width: 48, child: swatch),
              Expanded(child: name),
            ],
          );
  }
}
