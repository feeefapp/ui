import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

const _statuses = [
  'New',
  'Confirmed',
  'Shipped',
  'Delivered',
  'Returned',
  'Cancelled',
];
const _wilayas = [
  'Alger',
  'Oran',
  'Constantine',
  'Blida',
  'Sétif',
  'Annaba',
  'Tlemcen',
  'Béjaïa',
  'Batna',
  'Djelfa',
];

class FilterSheet extends StatefulWidget {
  const FilterSheet({super.key});

  @override
  State<FilterSheet> createState() => _FilterSheetState();
}

class _FilterSheetState extends State<FilterSheet> {
  bool _open = false;
  String _status = 'Confirmed';
  List<String> _wilayasPicked = ['Alger'];

  @override
  Widget build(BuildContext context) {
    final picked = _wilayasPicked;
    return _Device(
      label: 'A phone with a filters sheet',
      child: Stack(
        children: [
          // SheetBackdrop marks what recedes behind a full-height sheet.
          Positioned.fill(
            child: SheetBackdrop(
              child: NavigationStack(
                label: 'Orders',
                children: [
                  NavigationPage(
                    key: const ValueKey('orders'),
                    title: 'Orders',
                    subtitle: Text(
                      '$_status · ${picked.isNotEmpty ? picked.join(', ') : 'All wilayas'}',
                    ),
                    trailing: ToolbarGroup(
                      label: 'Orders tools',
                      children: [
                        Button(
                          variant: .text,
                          appearance: .toolbar,
                          onClick: () => setState(() => _open = true),
                          children: const [
                            LucideIcon(LucideIcons.slidersHorizontal, size: 18),
                            Text('Filters'),
                          ],
                        ),
                      ],
                    ),
                    child: ListSection(
                      header: const Text('Results'),
                      children: [
                        for (var i = 0; i < 12; i++)
                          ListRow(
                            title: Text(
                              '#${1048 - i} · ${picked.isNotEmpty ? picked.first : 'Alger'}',
                            ),
                            subtitle: Text(_status),
                            trailing: Text('${(2 + i) * 450} DA'),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          Positioned.fill(
            child: Sheet(
              open: _open,
              onOpenChange: (open) => setState(() => _open = open),
              label: 'Filters',
              container: true,
              detents: const [.medium, .large],
              title: const Text('Filters'),
              trailing: [
                ToolbarGroup(
                  label: 'Sheet actions',
                  children: [
                    Button(
                      variant: .text,
                      appearance: .toolbar,
                      onClick: () => setState(() => _wilayasPicked = []),
                      children: const [Text('Reset')],
                    ),
                  ],
                ),
              ],
              dock: PresentationDock(
                label: 'Apply filters',
                children: [
                  Button(
                    variant: .filled,
                    onClick: () => setState(() => _open = false),
                    children: const [Text('Show 24 orders')],
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  ListSection(
                    header: const Text('Status'),
                    children: [
                      for (final s in _statuses)
                        ListRow(
                          title: Text(s),
                          trailing: s == _status
                              ? const LucideIcon(
                                  LucideIcons.check,
                                  size: 18,
                                  semanticLabel: 'Selected',
                                )
                              : null,
                          onClick: () => setState(() => _status = s),
                        ),
                    ],
                  ),
                  ListSection(
                    header: const Text('Wilaya'),
                    footer: const Text(
                      'Drag the sheet up to see every wilaya.',
                    ),
                    children: [
                      for (final w in _wilayas)
                        ListRow(
                          title: Text(w),
                          trailing: picked.contains(w)
                              ? const LucideIcon(
                                  LucideIcons.check,
                                  size: 18,
                                  semanticLabel: 'Selected',
                                )
                              : null,
                          onClick: () => setState(
                            () => _wilayasPicked = picked.contains(w)
                                ? picked.where((x) => x != w).toList()
                                : [...picked, w],
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
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
