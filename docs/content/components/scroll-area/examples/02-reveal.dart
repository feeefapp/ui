import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

final _orders = [
  for (var i = 0; i < 16; i++)
    (
      id: '#${1060 - i}',
      city: ['Alger', 'Oran', 'Constantine', 'Blida'][i % 4],
    ),
];

class Reveal extends StatefulWidget {
  const Reveal({super.key});

  @override
  State<Reveal> createState() => _RevealState();
}

class _RevealState extends State<Reveal> {
  final _viewport = ScrollController();
  final _rows = [for (final _ in _orders) GlobalKey()];
  int _selected = 0;

  @override
  void dispose() {
    _viewport.dispose();
    super.dispose();
  }

  void _select(int index) {
    final next = index.clamp(0, _orders.length - 1);
    setState(() => _selected = next);
    // Scrolls only this viewport, and keeps the row out from under the dock.
    revealScrollChild(_viewport, _rows[next].currentContext, behavior: .smooth);
  }

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
      child: ClipRRect(
        borderRadius: radius,
        child: ScrollArea(
          label: 'Orders to confirm',
          controller: _viewport,
          bottom: Dock(
            label: 'Order navigation',
            content: Text(
              'Order ${_orders[_selected].id}',
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
            children: [
              Wrap(
                spacing: 12,
                runSpacing: 12,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  Button(
                    variant: .tonal,
                    disabled: _selected == 0,
                    onClick: () => _select(_selected - 1),
                    children: const [
                      LucideIcon(LucideIcons.arrowUp),
                      Text('Previous'),
                    ],
                  ),
                  Button(
                    variant: .filled,
                    disabled: _selected == _orders.length - 1,
                    onClick: () => _select(_selected + 1),
                    children: const [
                      LucideIcon(LucideIcons.arrowDown),
                      Text('Next'),
                    ],
                  ),
                ],
              ),
            ],
          ),
          child: Semantics(
            container: true,
            label: 'Orders',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              spacing: 8,
              children: [
                for (final (index, order) in _orders.indexed)
                  Semantics(
                    key: _rows[index],
                    selected: index == _selected,
                    button: true,
                    child: GestureDetector(
                      onTap: () => _select(index),
                      child: _Row(
                        selected: index == _selected,
                        title: 'Order ${order.id}',
                        detail: '${order.city} · waiting for confirmation',
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// `.scroll-demo-row`, selected = `[aria-selected='true']`.
class _Row extends StatelessWidget {
  const _Row({
    required this.selected,
    required this.title,
    required this.detail,
  });
  final bool selected;
  final String title, detail;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 14),
      decoration: BoxDecoration(
        color: selected ? c.controlSelected : c.surface,
        border: Border.all(color: selected ? c.primary : c.line),
        borderRadius: BorderRadius.circular(theme.sizes.radiusSmall),
      ),
      child: DefaultTextStyle.merge(
        style: const TextStyle(fontSize: 13),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          spacing: 2,
          children: [
            Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
            Text(
              detail,
              style: TextStyle(color: c.muted, fontSize: 13 * 0.833),
            ),
          ],
        ),
      ),
    );
  }
}
