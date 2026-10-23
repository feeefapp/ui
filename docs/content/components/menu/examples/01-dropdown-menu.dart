import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart' hide Action;

class DropdownMenuExample extends StatefulWidget {
  const DropdownMenuExample({super.key});

  @override
  State<DropdownMenuExample> createState() => _DropdownMenuExampleState();
}

class _DropdownMenuExampleState extends State<DropdownMenuExample> {
  String _status = 'Order #10482 · Confirmed';

  void _set(String status) => setState(() => _status = status);

  @override
  Widget build(BuildContext context) => Wrap(
    spacing: 12,
    runSpacing: 12,
    alignment: WrapAlignment.center,
    crossAxisAlignment: WrapCrossAlignment.center,
    children: [
      Semantics(liveRegion: true, child: Text(_status)),
      ActionsMenuAnchor(
        label: 'Order actions',
        actions: [
          CommandAction(
            id: 'copy',
            label: 'Copy tracking number',
            icon: const LucideIcon(LucideIcons.copy),
            onAction: () => _set('Tracking number copied.'),
          ),
          CommandAction(
            id: 'print',
            label: 'Print shipping label',
            icon: const LucideIcon(LucideIcons.printer),
            onAction: () => _set('Label sent to printer.'),
          ),
          GroupAction(
            id: 'courier',
            label: 'Send with',
            icon: const LucideIcon(LucideIcons.truck),
            actions: [
              for (final courier in ['Yalidine', 'ZR Express', 'Maystro'])
                CommandAction(
                  id: courier,
                  label: courier,
                  onAction: () => _set('Order #10482 · Sent with $courier'),
                ),
            ],
          ),
          CommandAction(
            id: 'cancel',
            label: 'Cancel order',
            icon: const LucideIcon(LucideIcons.trash2),
            destructive: true,
            onAction: () => _set('Order #10482 · Cancelled'),
          ),
        ],
        builder: (open) => IconButton(
          variant: .text,
          ariaLabel: 'Order actions',
          onClick: open ?? () {},
          icon: const LucideIcon(LucideIcons.ellipsis),
        ),
      ),
    ],
  );
}
