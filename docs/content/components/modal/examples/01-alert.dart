import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class AlertDemo extends StatefulWidget {
  const AlertDemo({super.key});

  @override
  State<AlertDemo> createState() => _AlertDemoState();
}

class _AlertDemoState extends State<AlertDemo> {
  bool _open = false;
  String _status = 'Order notifications are off.';

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 360,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Button(
          variant: .tonal,
          onClick: () => setState(() => _open = true),
          children: const [
            LucideIcon(LucideIcons.bell),
            Text('Notify me about new orders'),
          ],
        ),
        const SizedBox(height: 16),
        Semantics(liveRegion: true, child: Text(_status)),
        // Draws nothing in place (it presents in the overlay), so it sits outside the spacing.
        Alert(
          open: _open,
          onOpenChange: (open) => setState(() => _open = open),
          title: 'Turn on order notifications?',
          message: const Text(
            'You’ll get a notification on this device for every new order.',
          ),
          actions: [
            const AlertAction(label: 'Not now', role: .cancel),
            AlertAction(
              label: 'Turn on',
              role: .primary,
              onAction: () {
                setState(() => _status = 'Order notifications are on.');
                return null;
              },
            ),
          ],
        ),
      ],
    ),
  );
}
