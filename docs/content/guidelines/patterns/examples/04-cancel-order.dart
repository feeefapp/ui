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

  void _cancel() {
    if (_reason == null) {
      setState(
        () => _error = 'Choose why the order is cancelled; it shows in your failure reports.',
      );
      return;
    }
    setState(
      () => _status =
          'Order #1048 was cancelled (${_reason!.toLowerCase()}). 2 items went back to stock.',
    );
    _close();
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
        Modal(
          open: _open,
          close: _close,
          label: 'Cancel order #1048?',
          showClose: false,
          // `.pt-dialog`: 24px padding, 16px gaps.
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              spacing: 16,
              children: [
                Semantics(
                  header: true,
                  child: const Text(
                    'Cancel order #1048?',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w500,
                      letterSpacing: 18 * -0.035,
                      height: 20 / 18,
                      leadingDistribution: TextLeadingDistribution.even,
                    ),
                  ),
                ),
                const Text(
                  'Amina Benali won’t be called again, the 2 reserved items go back to stock and the order moves to Failed. You can’t undo this.',
                ),
                Select(
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
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  alignment: WrapAlignment.end,
                  children: [
                    Button(
                      variant: .text,
                      onClick: _close,
                      children: const [Text('Keep order')],
                    ),
                    Button(
                      variant: .destructive,
                      onClick: _cancel,
                      children: const [Text('Cancel order')],
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ],
    ),
  );
}
