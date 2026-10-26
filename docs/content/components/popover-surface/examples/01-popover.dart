import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class PopoverExample extends StatefulWidget {
  const PopoverExample({super.key});

  @override
  State<PopoverExample> createState() => _PopoverExampleState();
}

class _PopoverExampleState extends State<PopoverExample> {
  String _note = 'Call before arriving, 2nd floor.';

  @override
  Widget build(BuildContext context) => Popover(
    label: 'Delivery note',
    sideOffset: 8,
    collisionPadding: 12,
    width: 320,
    padding: const EdgeInsets.all(16),
    trigger: (context, toggle, open) => Button(
      variant: .tonal,
      onClick: toggle,
      children: const [
        LucideIcon(LucideIcons.stickyNote),
        Text('Delivery note'),
      ],
    ),
    content: (context, close) => Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 16,
      children: [
        const Text(
          'Note for the courier',
          style: TextStyle(fontWeight: FontWeight.w700),
        ),
        TextField(
          hint: 'Note',
          multiline: true,
          minLines: 2,
          value: _note,
          onValueChange: (value) => setState(() => _note = value),
        ),
        Button(
          variant: .filled,
          onClick: close,
          children: const [Text('Done')],
        ),
      ],
    ),
  );
}
