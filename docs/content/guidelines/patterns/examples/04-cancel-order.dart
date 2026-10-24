import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class CancelOrder extends StatefulWidget {
  const CancelOrder({super.key});

  @override
  State<CancelOrder> createState() => _CancelOrderState();
}

class _CancelOrderState extends State<CancelOrder> {
  bool _open = false;
  String? _reason;
  String? _error;
  String _status =
      'Order #1048 · Amina Benali · 9 600 DA · waiting for confirmation';

  void _close() => setState(() {
    _open = false;
    _error = null;
  });

  /// Returning false keeps the alert open to show the reason's error.
  bool? _cancel() {
    if (_reason == null) {
      setState(
        () => _error = 'Choose why the order is cancelled; it shows in your failure reports.',
      );
      return false;
    }
    setState(
      () => _status =
          'Order #1048 was cancelled (${_reason!.toLowerCase()}). 2 items went back to stock.',
    );
    return null;
  }

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 360,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Semantics(liveRegion: true, child: Text(_status)),
        const SizedBox(height: 16),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            Button(
              variant: .destructive,
              onClick: () => setState(() => _open = true),
              children: const [Text('Cancel order')],
            ),
          ],
        ),
        Alert(
          open: _open,
          onOpenChange: (open) => open ? setState(() => _open = true) : _close(),
          title: 'Cancel order #1048?',
          message: const Text(
            'Amina Benali won’t be called again, the 2 reserved items go back to stock and the order moves to Failed. You can’t undo this.',
          ),
          actions: [
            const AlertAction(label: 'Keep order', role: .cancel),
            AlertAction(
              label: 'Cancel order',
              role: .destructive,
              onAction: _cancel,
            ),
          ],
          child: Select(
            hint: 'Reason',
            value: _reason,
            error: _error,
            onValueChange: (value) => setState(() {
              _reason = value;
              _error = null;
            }),
            children: const [
              Option(child: Text('Customer refused')),
              Option(child: Text('Duplicate order')),
              Option(child: Text('Fake order')),
              Option(child: Text('Out of stock')),
            ],
          ),
        ),
      ],
    ),
  );
}
