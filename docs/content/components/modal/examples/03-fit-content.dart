import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class FitContent extends StatefulWidget {
  const FitContent({super.key});

  @override
  State<FitContent> createState() => _FitContentState();
}

class _FitContentState extends State<FitContent> {
  bool _open = false;
  String _name = 'Dz Sneakers';
  String _draft = 'Dz Sneakers';

  void _close() => setState(() => _open = false);

  @override
  Widget build(BuildContext context) => Wrap(
    spacing: 12,
    runSpacing: 12,
    alignment: WrapAlignment.center,
    crossAxisAlignment: WrapCrossAlignment.center,
    children: [
      Text(_name),
      Button(
        variant: .tonal,
        onClick: () => setState(() {
          _draft = _name;
          _open = true;
        }),
        children: const [Text('Rename store')],
      ),
      Modal(
        open: _open,
        close: _close,
        label: 'Rename store',
        scrollable: true,
        fitContent: true,
        bottom: Dock(
          label: 'Rename actions',
          children: [
            Button(
              variant: .filled,
              disabled: _draft.trim().isEmpty,
              onClick: () {
                setState(() => _name = _draft.trim());
                _close();
              },
              children: const [Text('Save name')],
            ),
          ],
        ),
        child: TextField(
          hint: 'Store name',
          value: _draft,
          onValueChange: (value) => setState(() => _draft = value),
          supportingText: const Text(
            'Shown on your storefront and order messages.',
          ),
        ),
      ),
    ],
  );
}
