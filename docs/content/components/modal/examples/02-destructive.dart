import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class DestructiveConfirm extends StatefulWidget {
  const DestructiveConfirm({super.key});

  @override
  State<DestructiveConfirm> createState() => _DestructiveConfirmState();
}

class _DestructiveConfirmState extends State<DestructiveConfirm> {
  String _status = 'Order #10482 is waiting for confirmation.';

  /// showAlert completes with the chosen action's value.
  Future<void> _confirm() async {
    final cancel = await showAlert<bool>(
      context,
      builder: (context) => const Alert(
        title: 'Cancel order #10482?',
        message: Text(
          'The customer won’t be called again and the reserved stock goes back to inventory. You can’t undo this.',
        ),
        actions: [
          AlertAction(label: 'Keep order', role: .cancel, value: false),
          AlertAction(label: 'Cancel order', role: .destructive, value: true),
        ],
      ),
    );
    if (cancel == true && mounted) {
      setState(() => _status = 'Order #10482 was cancelled.');
    }
  }

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 360,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 16,
      children: [
        Button(
          variant: .destructive,
          onClick: _confirm,
          children: const [Text('Cancel order')],
        ),
        Semantics(liveRegion: true, child: Text(_status)),
      ],
    ),
  );
}
