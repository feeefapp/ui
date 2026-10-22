import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class AdaptiveSheet extends StatefulWidget {
  const AdaptiveSheet({super.key});

  @override
  State<AdaptiveSheet> createState() => _AdaptiveSheetState();
}

class _AdaptiveSheetState extends State<AdaptiveSheet> {
  bool _open = false;

  void _close() => setState(() => _open = false);

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 360,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Button(
          variant: .filled,
          onClick: () => setState(() => _open = true),
          children: const [Text('Edit delivery address')],
        ),
        // Without `container` the sheet presents in the nearest Overlay: a bottom sheet on a
        // phone, a centered dialog on a wide window.
        Sheet(
          open: _open,
          onOpenChange: (open) => setState(() => _open = open),
          label: 'Delivery address',
          detents: const [.fit],
          top: const ToolbarGroup(
            label: 'Sheet title',
            children: [
              Padding(
                padding: EdgeInsets.symmetric(horizontal: 12),
                child: Text(
                  'Delivery address',
                  softWrap: false,
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
          bottom: Dock(
            label: 'Address actions',
            children: [
              Button(
                variant: .text,
                onClick: _close,
                children: const [Text('Cancel')],
              ),
              Button(
                variant: .filled,
                onClick: _close,
                children: const [Text('Save address')],
              ),
            ],
          ),
          child: const Padding(
            padding: EdgeInsets.symmetric(vertical: 4),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              spacing: 16,
              children: [
                TextField(hint: 'Wilaya', defaultValue: 'Alger'),
                TextField(hint: 'Commune', defaultValue: 'Bab Ezzouar'),
                TextField(
                  hint: 'Street and building',
                  defaultValue: 'Cité 2068 Logements, Bt 12',
                ),
              ],
            ),
          ),
        ),
      ],
    ),
  );
}
