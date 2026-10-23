import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart' hide Action;

class MenusAtBothEnds extends StatefulWidget {
  const MenusAtBothEnds({super.key});

  @override
  State<MenusAtBothEnds> createState() => _MenusAtBothEndsState();
}

class _MenusAtBothEndsState extends State<MenusAtBothEnds> {
  static const _sorts = ['Newest first', 'Oldest first', 'Highest total'];
  String _sort = _sorts.first;
  String _status = 'Nothing done yet.';

  void _set(String status) => setState(() => _status = status);

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 560,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 12,
      children: [
        Toolbar(
          label: 'Orders',
          leading: ToolbarGroup(
            label: 'Sorting',
            children: [
              ActionsMenuAnchor(
                label: 'Sort orders',
                actions: [
                  for (final sort in _sorts)
                    ToggleAction(
                      id: sort,
                      label: sort,
                      checked: sort == _sort,
                      onCheckedChange: (_) => setState(() => _sort = sort),
                    ),
                ],
                builder: (open) => IconButton(
                  variant: .text,
                  appearance: .toolbar,
                  ariaLabel: 'Sort orders',
                  onClick: open ?? () {},
                  icon: const LucideIcon(LucideIcons.arrowDownUp),
                ),
              ),
            ],
          ),
          trailing: ToolbarGroup(
            label: 'Order actions',
            children: [
              ActionsMenuAnchor(
                label: 'More actions',
                actions: [
                  CommandAction(
                    id: 'copy',
                    label: 'Copy tracking numbers',
                    icon: const LucideIcon(LucideIcons.copy),
                    onAction: () => _set('Tracking numbers copied.'),
                  ),
                  CommandAction(
                    id: 'print',
                    label: 'Print labels',
                    icon: const LucideIcon(LucideIcons.printer),
                    onAction: () => _set('Labels sent to the printer.'),
                  ),
                  CommandAction(
                    id: 'cancel',
                    label: 'Cancel orders',
                    icon: const LucideIcon(LucideIcons.trash2),
                    destructive: true,
                    onAction: () => _set('Orders cancelled.'),
                  ),
                ],
                builder: (open) => IconButton(
                  variant: .text,
                  appearance: .toolbar,
                  ariaLabel: 'More actions',
                  onClick: open ?? () {},
                  icon: const LucideIcon(LucideIcons.ellipsis),
                ),
              ),
            ],
          ),
        ),
        Semantics(liveRegion: true, child: Text('$_sort · $_status')),
      ],
    ),
  );
}
