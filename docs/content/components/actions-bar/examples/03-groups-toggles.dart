import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart' hide Action;

class GroupsAndToggles extends StatefulWidget {
  const GroupsAndToggles({super.key});

  @override
  State<GroupsAndToggles> createState() => _GroupsAndTogglesState();
}

class _GroupsAndTogglesState extends State<GroupsAndToggles> {
  bool _urgent = false;
  bool _hidePaid = true;
  String _status = '';

  void _set(String status) => setState(() => _status = status);

  @override
  Widget build(BuildContext context) {
    final actions = <Action>[
      ToggleAction(
        id: 'urgent',
        label: 'Urgent',
        icon: const LucideIcon(LucideIcons.flag),
        checked: _urgent,
        onCheckedChange: (value) => setState(() => _urgent = value),
      ),
      ToggleAction(
        id: 'hide-paid',
        label: 'Hide paid',
        icon: const LucideIcon(LucideIcons.eye),
        display: .icon,
        checked: _hidePaid,
        onCheckedChange: (value) => setState(() => _hidePaid = value),
      ),
      GroupAction(
        id: 'tag',
        label: 'Tag',
        icon: const LucideIcon(LucideIcons.tag),
        actions: [
          CommandAction(
            id: 'tag-vip',
            label: 'VIP customer',
            onAction: () => _set('Tagged VIP customer'),
          ),
          CommandAction(
            id: 'tag-return',
            label: 'Return risk',
            onAction: () => _set('Tagged return risk'),
          ),
        ],
      ),
      GroupAction(
        id: 'export',
        label: 'Export',
        icon: const LucideIcon(LucideIcons.download),
        actions: [
          CommandAction(
            id: 'export-csv',
            label: 'CSV',
            icon: const LucideIcon(LucideIcons.fileText),
            onAction: () => _set('Exported CSV'),
          ),
          GroupAction(
            id: 'export-sheet',
            label: 'Spreadsheet',
            icon: const LucideIcon(LucideIcons.fileSpreadsheet),
            actions: [
              CommandAction(
                id: 'export-xlsx',
                label: 'Excel (.xlsx)',
                onAction: () => _set('Exported Excel'),
              ),
              CommandAction(
                id: 'export-sheets',
                label: 'Google Sheets',
                disabled: true,
                onAction: () {},
              ),
            ],
          ),
        ],
      ),
    ];
    return SizedBox(
      width: 560,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 12,
        children: [
          ActionsBar(
            label: 'Order list actions',
            actions: actions,
            align: .start,
          ),
          Semantics(
            liveRegion: true,
            child: Text(
              _status.isNotEmpty
                  ? _status
                  : 'Urgent: ${_urgent ? 'on' : 'off'} · Hide paid: ${_hidePaid ? 'on' : 'off'}',
            ),
          ),
        ],
      ),
    );
  }
}
