import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class Plain extends StatefulWidget {
  const Plain({super.key});

  @override
  State<Plain> createState() => _PlainState();
}

class _PlainState extends State<Plain> {
  String _period = 'week';

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 560,
    child: Toolbar(
      label: 'Sales report',
      leading: ToolbarGroup(
        label: 'Period',
        children: [
          SegmentedControl<String>(
            label: 'Report period',
            appearance: .plain,
            value: _period,
            onChange: (value) => setState(() => _period = value),
            options: const [
              SegmentOption(value: 'day', label: 'Day'),
              SegmentOption(value: 'week', label: 'Week'),
              SegmentOption(value: 'month', label: 'Month'),
            ],
          ),
        ],
      ),
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
  );
}
