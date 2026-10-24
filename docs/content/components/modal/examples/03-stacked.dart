import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class Stacked extends StatefulWidget {
  const Stacked({super.key});

  @override
  State<Stacked> createState() => _StackedState();
}

class _StackedState extends State<Stacked> {
  bool _open = false;
  String _status = 'The product has unsaved changes.';

  bool? _say(String status) {
    setState(() => _status = status);
    return null;
  }

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 360,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Button(
          variant: .outlined,
          onClick: () => setState(() => _open = true),
          children: const [Text('Leave the editor')],
        ),
        const SizedBox(height: 16),
        Semantics(liveRegion: true, child: Text(_status)),
        // Draws nothing in place (it presents in the overlay), so it sits outside the spacing.
        Alert(
          open: _open,
          onOpenChange: (open) => setState(() => _open = open),
          title: 'Save your changes?',
          message: const Text(
            'You changed the price and two photos of “Leather handbag”.',
          ),
          actions: [
            AlertAction(
              label: 'Save changes',
              role: .primary,
              onAction: () => _say('Changes saved.'),
            ),
            AlertAction(
              label: 'Discard changes',
              role: .destructive,
              onAction: () => _say('Changes discarded.'),
            ),
            const AlertAction(label: 'Keep editing', role: .cancel),
          ],
        ),
      ],
    ),
  );
}
