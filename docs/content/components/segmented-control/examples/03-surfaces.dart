import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

const _periods = [
  SegmentOption(value: 'day', label: 'Day'),
  SegmentOption(value: 'week', label: 'Week'),
  SegmentOption(value: 'month', label: 'Month'),
];

class Surfaces extends StatefulWidget {
  const Surfaces({super.key});

  @override
  State<Surfaces> createState() => _SurfacesState();
}

class _SurfacesState extends State<Surfaces> {
  String _period = 'week';

  Widget _control() => SegmentedControl<String>(
    label: 'Report period',
    value: _period,
    onChange: (value) => setState(() => _period = value),
    options: _periods,
  );

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    return SizedBox(
      width: 560,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        spacing: 16,
        children: [
          // Floating: in a glass bubble of a toolbar.
          Toolbar(
            label: 'Sales report',
            leading: ToolbarGroup(label: 'Period', children: [_control()]),
            trailing: ToolbarGroup(
              label: 'Export',
              children: [
                IconButton(
                  variant: .text,
                  appearance: .toolbar,
                  ariaLabel: 'Export report',
                  onClick: () {},
                  icon: const LucideIcon(LucideIcons.download),
                ),
              ],
            ),
          ),
          // In content or a form: on a plain box, the control's capsule.
          DecoratedBox(
            decoration: ShapeDecoration(
              color: theme.colors.surfaceSoft,
              shape: SuperellipseBorder(radius: theme.sizes.radiusControl),
            ),
            child: _control(),
          ),
          // Bare: just the options and the pill.
          _control(),
        ],
      ),
    );
  }
}
