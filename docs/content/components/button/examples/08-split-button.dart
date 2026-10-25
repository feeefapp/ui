import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart' hide Action;

class SplitButton extends StatefulWidget {
  const SplitButton({super.key});

  @override
  State<SplitButton> createState() => _SplitButtonState();
}

class _SplitButtonState extends State<SplitButton> {
  String _status = '';

  void _set(String status) => setState(() => _status = status);

  @override
  Widget build(BuildContext context) {
    final actions = <Action>[
      CommandAction(
        id: 'confirm',
        label: 'Confirm order',
        icon: const LucideIcon(LucideIcons.check),
        variant: .filled,
        priority: 100,
        onAction: () => _set('Order #10482 confirmed'),
      ),
      GroupAction(
        id: 'confirm-options',
        label: 'More ways to confirm',
        icon: const LucideIcon(LucideIcons.chevronDown),
        display: .icon,
        // Same priority as the main action: the two halves never split up when the bar runs out of room.
        priority: 100,
        actions: [
          CommandAction(
            id: 'confirm-ship',
            label: 'Confirm and ship',
            icon: const LucideIcon(LucideIcons.truck),
            onAction: () => _set('Confirmed and sent to the courier'),
          ),
          CommandAction(
            id: 'confirm-quiet',
            label: 'Confirm without SMS',
            icon: const LucideIcon(LucideIcons.messageSquareOff),
            onAction: () => _set('Confirmed, no SMS sent'),
          ),
          CommandAction(
            id: 'call-back',
            label: 'Call back later',
            icon: const LucideIcon(LucideIcons.clock),
            onAction: () => _set('Call back scheduled'),
          ),
        ],
      ),
    ];
    final theme = ThemeProvider.of(context);
    return SizedBox(
      width: 360,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        spacing: 16,
        children: [
          // A dock tells its bar how much room it has: a bubble that hugs its content would fold
          // both halves into the overflow menu.
          Dock(
            label: 'Order',
            children: [ActionsBar(label: 'Confirm order', actions: actions)],
          ),
          Semantics(
            liveRegion: true,
            child: SizedBox(
              height: 20,
              child: Text(_status, style: TextStyle(color: theme.colors.muted)),
            ),
          ),
        ],
      ),
    );
  }
}
