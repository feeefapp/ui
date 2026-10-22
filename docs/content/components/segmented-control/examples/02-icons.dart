import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class WithIcons extends StatefulWidget {
  const WithIcons({super.key});

  @override
  State<WithIcons> createState() => _WithIconsState();
}

class _WithIconsState extends State<WithIcons> {
  String _view = 'board';

  @override
  Widget build(BuildContext context) => SegmentedControl<String>(
    label: 'Orders view',
    value: _view,
    onChange: (value) => setState(() => _view = value),
    options: const [
      SegmentOption(
        value: 'list',
        label: 'List',
        icon: LucideIcon(LucideIcons.list),
      ),
      SegmentOption(
        value: 'board',
        label: 'Board',
        icon: LucideIcon(LucideIcons.columns3),
      ),
      SegmentOption(
        value: 'grid',
        label: 'Grid',
        icon: LucideIcon(LucideIcons.layoutGrid),
      ),
    ],
  );
}
