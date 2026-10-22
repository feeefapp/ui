import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class Focus extends StatefulWidget {
  const Focus({super.key});

  @override
  State<Focus> createState() => _FocusState();
}

class _FocusState extends State<Focus> {
  bool _open = false;
  String _phone = '0555 12 34 56';
  final _phoneField = FocusNode();
  final _row = FocusNode();

  void _close() => setState(() => _open = false);

  @override
  void dispose() {
    _phoneField.dispose();
    _row.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Column(
    mainAxisSize: MainAxisSize.min,
    children: [
      Button(
        focusNode: _row,
        variant: .elevated,
        onClick: () => setState(() => _open = true),
        children: [const LucideIcon(LucideIcons.phone), Text(_phone)],
      ),
      Modal(
        open: _open,
        close: _close,
        label: 'Correct the phone number',
        scrollable: true,
        fitContent: true,
        initialFocus: _phoneField,
        returnFocus: _row,
        bottom: Dock(
          label: 'Phone actions',
          children: [
            Button(
              variant: .filled,
              onClick: _close,
              children: const [Text('Save')],
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          spacing: 16,
          children: [
            const TextField(
              hint: 'Customer name',
              defaultValue: 'Yacine Benali',
              readOnly: true,
            ),
            TextField(
              focusNode: _phoneField,
              hint: 'Phone',
              keyboardType: TextInputType.phone,
              value: _phone,
              onValueChange: (value) => setState(() => _phone = value),
            ),
          ],
        ),
      ),
    ],
  );
}
