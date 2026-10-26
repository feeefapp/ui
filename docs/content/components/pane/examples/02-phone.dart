import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

const _orders = [
  (id: 1048, name: 'Amina Benali', city: 'Alger', total: '4,500 DA'),
  (id: 1047, name: 'Yacine Haddad', city: 'Oran', total: '2,900 DA'),
  (id: 1046, name: 'Sara Meziane', city: 'Blida', total: '6,200 DA'),
];

class PhonePane extends StatefulWidget {
  const PhonePane({super.key});

  @override
  State<PhonePane> createState() => _PhonePaneState();
}

class _PhonePaneState extends State<PhonePane> {
  bool _open = false;
  var _order = _orders.first;

  void _close() => setState(() => _open = false);

  @override
  Widget build(BuildContext context) => _Device(
    label: 'A phone where the pane opens as a sheet',
    child: Stack(
      children: [
        Positioned.fill(
          child: SheetBackdrop(
            child: NavigationStack(
              label: 'Orders',
              children: [
                NavigationPage(
                  key: const ValueKey('orders'),
                  title: 'Orders',
                  child: ListSection(
                    header: const Text('To confirm'),
                    children: [
                      for (final o in _orders)
                        ListRow(
                          title: Text('#${o.id} · ${o.name}'),
                          subtitle: Text(o.city),
                          trailing: Text(o.total),
                          onClick: () => setState(() {
                            _order = o;
                            _open = true;
                          }),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        Positioned.fill(
          child: Pane(
            open: _open,
            onOpenChange: (open) => setState(() => _open = open),
            container: true,
            label: 'Order #${_order.id}',
            title: Text('Order #${_order.id}'),
            dock: PresentationDock(
              children: [
                Button(
                  variant: .text,
                  onClick: _close,
                  children: const [
                    LucideIcon(LucideIcons.phone),
                    Text('Call'),
                  ],
                ),
                Button(
                  variant: .filled,
                  onClick: _close,
                  children: const [Text('Confirm order')],
                ),
              ],
            ),
            child: ListSection(
              children: [
                ListRow(
                  title: const Text('Customer'),
                  trailing: Text(_order.name),
                ),
                ListRow(
                  title: const Text('Wilaya'),
                  trailing: Text(_order.city),
                ),
                ListRow(
                  title: const Text('Total'),
                  trailing: Text(_order.total),
                ),
              ],
            ),
          ),
        ),
      ],
    ),
  );
}

/// The docs' pretend phone (docs/src/blocks/device.tsx): lays [child] out at a real phone size and
/// scales the screen down to fit the column, centred.
class _Device extends StatelessWidget {
  const _Device({required this.label, required this.child});
  final String label;
  final Widget child;

  static const _width = 390.0;
  static const _height = 760.0;

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
          height: (_height * scale).roundToDouble(),
          child: Center(
            child: Semantics(
              container: true,
              label: label,
              child: Transform.scale(
                scale: scale,
                child: OverflowBox(
                  minWidth: _width,
                  maxWidth: _width,
                  minHeight: _height,
                  maxHeight: _height,
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
