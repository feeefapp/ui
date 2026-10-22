import 'dart:math' as math;

import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

const _columns = ['New', 'Confirmed', 'Shipped'];

typedef _Order = ({int id, String customer, String column});

const List<_Order> _start = [
  (id: 1048, customer: 'Amina', column: 'New'),
  (id: 1047, customer: 'Yacine', column: 'New'),
  (id: 1046, customer: 'Sara', column: 'Confirmed'),
  (id: 1045, customer: 'Karim', column: 'New'),
  (id: 1044, customer: 'Lina', column: 'Confirmed'),
  (id: 1043, customer: 'Omar', column: 'Shipped'),
];

String _next(String column) =>
    _columns[(_columns.indexOf(column) + 1) % _columns.length];

class OrderBoard extends StatefulWidget {
  const OrderBoard({super.key});

  @override
  State<OrderBoard> createState() => _OrderBoardState();
}

class _OrderBoardState extends State<OrderBoard> {
  List<_Order> _orders = _start;

  void _advance(int id) => setState(
    () => _orders = [
      for (final o in _orders)
        o.id == id
            ? (id: o.id, customer: o.customer, column: _next(o.column))
            : o,
    ],
  );

  @override
  Widget build(BuildContext context) => SizedBox(
    width: double.infinity,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 16,
      children: [
        Wrap(
          spacing: 12,
          runSpacing: 12,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            Button(
              variant: .tonal,
              controlSize: .compact,
              onClick: () => setState(
                () => _orders = [..._orders]..shuffle(math.Random()),
              ),
              children: const [
                LucideIcon(LucideIcons.shuffle),
                Text('Shuffle'),
              ],
            ),
            Button(
              variant: .text,
              controlSize: .compact,
              onClick: () => setState(() => _orders = _start),
              children: const [Text('Reset')],
            ),
          ],
        ),
        LayoutGroup(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            spacing: 12,
            children: [
              for (final column in _columns)
                Expanded(
                  child: _Column(
                    title: column,
                    children: [
                      for (final o in _orders.where((o) => o.column == column))
                        // The id ties this card's old and new place together, across columns too.
                        LayoutGroupItem(
                          key: ValueKey(o.id),
                          layoutId: 'order-${o.id}',
                          child: _Card(
                            order: o,
                            onAdvance: () => _advance(o.id),
                          ),
                        ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ],
    ),
  );
}

/// layout-demo.css `.lt-column`.
class _Column extends StatelessWidget {
  const _Column({required this.title, required this.children});
  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    return Semantics(
      container: true,
      label: title,
      child: Container(
        constraints: const BoxConstraints(minHeight: 220),
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: Color.lerp(theme.colors.surface, theme.colors.ink, 0.04),
          borderRadius: BorderRadius.circular(theme.sizes.radiusGroup),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          spacing: 8,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(4, 2, 4, 4),
              child: Semantics(
                header: true,
                child: Text(
                  title,
                  style: TextStyle(
                    color: theme.colors.muted,
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    // The kit's heading rhythm (system.css h3): tight lines, tighter letters.
                    height: 1.12,
                    letterSpacing: -0.035 * 13,
                  ),
                ),
              ),
            ),
            ...children,
          ],
        ),
      ),
    );
  }
}

/// layout-demo.css `.lt-card`.
class _Card extends StatelessWidget {
  const _Card({required this.order, required this.onAdvance});
  final _Order order;
  final VoidCallback onAdvance;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final rtl = Directionality.of(context) == TextDirection.rtl;
    return Container(
      padding: const EdgeInsetsDirectional.fromSTEB(12, 4, 4, 4),
      decoration: BoxDecoration(
        color: theme.colors.surface,
        border: Border.all(color: theme.colors.line),
        borderRadius: BorderRadius.circular(theme.sizes.radiusControlCompact),
      ),
      child: Row(
        spacing: 8,
        children: [
          Expanded(
            child: Text.rich(
              TextSpan(
                children: [
                  TextSpan(
                    text: '#${order.id}',
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  TextSpan(text: ' ${order.customer}'),
                ],
              ),
              style: const TextStyle(fontSize: 14),
              maxLines: 1,
              softWrap: false,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          IconButton(
            variant: .text,
            controlSize: .compact,
            ariaLabel: 'Move #${order.id} to ${_next(order.column)}',
            onClick: onAdvance,
            // `lab-dir-flip`: the arrow points forward in right-to-left text too.
            icon: Transform.flip(
              flipX: rtl,
              child: const LucideIcon(LucideIcons.arrowRight),
            ),
          ),
        ],
      ),
    );
  }
}
