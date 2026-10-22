import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart' hide Action;

class InADock extends StatefulWidget {
  const InADock({super.key});

  @override
  State<InADock> createState() => _InADockState();
}

class _InADockState extends State<InADock> {
  String _status = '3 selected';
  late final List<Action> _actions = [
    CommandAction(
      id: 'delete',
      label: 'Delete',
      icon: const LucideIcon(LucideIcons.trash2),
      destructive: true,
      priority: -1,
      onAction: () => setState(() => _status = '3 orders deleted'),
    ),
    CommandAction(
      id: 'print',
      label: 'Print labels',
      icon: const LucideIcon(LucideIcons.printer),
      onAction: () => setState(() => _status = 'Labels sent to the printer'),
    ),
    CommandAction(
      id: 'assign',
      label: 'Assign agent',
      icon: const LucideIcon(LucideIcons.userRound),
      priority: 1,
      onAction: () => setState(() => _status = 'Assigned to Amina'),
    ),
    CommandAction(
      id: 'ship',
      label: 'Ship',
      icon: const LucideIcon(LucideIcons.truck),
      priority: 2,
      onAction: () => setState(() => _status = '3 orders sent to Yalidine'),
    ),
    CommandAction(
      id: 'confirm',
      label: 'Confirm',
      icon: const LucideIcon(LucideIcons.check),
      variant: .filled,
      priority: 10,
      onAction: () => setState(() => _status = '3 orders confirmed'),
    ),
  ];

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 560,
    child: Dock(
      label: 'Selected orders',
      content: Semantics(liveRegion: true, child: Text(_status)),
      children: [
        ActionsBar(label: 'Selected order actions', actions: _actions),
      ],
    ),
  );
}
