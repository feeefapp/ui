import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class Inspector extends StatefulWidget {
  const Inspector({super.key});

  @override
  State<Inspector> createState() => _InspectorState();
}

class _InspectorState extends State<Inspector> {
  bool _open = false;
  String _status = 'Amina Benali · 0555 12 34 56';

  void _close() => setState(() => _open = false);

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
            LucideIcon(LucideIcons.pencil),
            Text('Edit customer'),
          ],
        ),
        const SizedBox(height: 16),
        Semantics(liveRegion: true, child: Text(_status)),
        // Draws nothing in place (it presents in the overlay), so it sits outside the spacing.
        Pane(
          open: _open,
          onOpenChange: (open) => setState(() => _open = open),
          label: 'Edit customer',
          title: const Text('Edit customer'),
          dock: PresentationDock(
            children: [
              Button(
                variant: .text,
                onClick: _close,
                children: const [Text('Cancel')],
              ),
              Button(
                variant: .filled,
                onClick: () => setState(() {
                  _status = 'Customer saved.';
                  _open = false;
                }),
                children: const [Text('Save customer')],
              ),
            ],
          ),
          child: const Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: 16,
            children: [
              TextField(hint: 'Name', defaultValue: 'Amina Benali'),
              TextField(
                hint: 'Phone',
                keyboardType: TextInputType.phone,
                defaultValue: '0555 12 34 56',
              ),
              TextField(hint: 'Wilaya', defaultValue: 'Alger'),
              TextField(hint: 'Commune', defaultValue: 'Bab Ezzouar'),
              TextField(
                hint: 'Note for the courier',
                defaultValue: 'Call before coming.',
              ),
            ],
          ),
        ),
      ],
    ),
  );
}
