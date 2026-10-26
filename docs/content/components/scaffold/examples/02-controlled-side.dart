import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

const _pages = [
  (label: 'Orders', icon: LucideIcons.shoppingBag),
  (label: 'Products', icon: LucideIcons.package),
  (label: 'Deliveries', icon: LucideIcons.truck),
];

class ControlledSide extends StatefulWidget {
  const ControlledSide({super.key});

  @override
  State<ControlledSide> createState() => _ControlledSideState();
}

class _ControlledSideState extends State<ControlledSide> {
  // Keep the mode in your own state (or a saved preference) and let the scaffold report changes.
  ScaffoldSideMode _mode = .rail;
  int _changes = 0;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    spacing: 12,
    children: [
      DecoratedBox(
        decoration: ShapeDecoration(
          color: ThemeProvider.of(context).colors.surfaceSoft,
          shape: SuperellipseBorder(
            radius: ThemeProvider.of(context).sizes.radiusControl,
          ),
        ),
        child: SegmentedControl<ScaffoldSideMode>(
          equalWidth: true,
          label: 'Sidebar mode',
          value: _mode,
          onChange: (mode) => setState(() => _mode = mode),
          options: const [
            SegmentOption(value: .expanded, label: 'Expanded'),
            SegmentOption(value: .rail, label: 'Rail'),
            SegmentOption(value: .hidden, label: 'Hidden'),
          ],
        ),
      ),
      _Frame(
        child: Scaffold(
          compactBreakpoint: 420,
          sideMode: _mode,
          onSideModeChange: (next) => setState(() {
            _mode = next;
            _changes++;
          }),
          side: Builder(
            builder: (context) {
              final state = Scaffold.of(context);
              return ScaffoldSide(
                leading: const Align(
                  alignment: AlignmentDirectional.centerStart,
                  child: ScaffoldToggleButton(),
                ),
                child: Semantics(
                  container: true,
                  label: 'Store pages',
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    spacing: 2,
                    children: [
                      for (final (index, item) in _pages.indexed)
                        NavigationItem(
                          compact:
                              state.sideMode == ScaffoldSideMode.rail &&
                              !state.drawerOpen,
                          label: item.label,
                          icon: LucideIcon(item.icon),
                          active: index == 0,
                          onSelect: () {},
                        ),
                    ],
                  ),
                ),
              );
            },
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: 8,
            children: [
              const Padding(
                padding: EdgeInsets.only(bottom: 4),
                child: Text(
                  'Orders',
                  style: TextStyle(
                    fontSize: 18,
                    height: 20 / 18,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              Text(
                'The sidebar is ${_mode.name}. The toggle inside it changed the mode '
                '$_changes ${_changes == 1 ? 'time' : 'times'}.',
              ),
            ],
          ),
        ),
      ),
    ],
  );
}

/// `.scaffold-demo-frame`: a scaffold fills its parent, so the demo gets a bounded box.
class _Frame extends StatelessWidget {
  const _Frame({required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final radius = BorderRadius.circular(theme.sizes.radiusPanel);
    return Container(
      width: double.infinity,
      height: 420,
      foregroundDecoration: BoxDecoration(
        border: Border.all(color: theme.colors.line),
        borderRadius: radius,
      ),
      decoration: BoxDecoration(
        color: theme.colors.ground,
        borderRadius: radius,
      ),
      clipBehavior: Clip.antiAlias,
      child: Padding(padding: const EdgeInsets.all(1), child: child),
    );
  }
}
