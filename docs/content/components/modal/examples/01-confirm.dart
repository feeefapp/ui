import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class Confirm extends StatefulWidget {
  const Confirm({super.key});

  @override
  State<Confirm> createState() => _ConfirmState();
}

class _ConfirmState extends State<Confirm> {
  bool _open = false;
  String _status = 'Order #10482 is waiting for confirmation.';

  void _close() => setState(() => _open = false);

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 360,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 16,
      children: [
        Button(
          variant: .destructive,
          onClick: () => setState(() => _open = true),
          children: const [Text('Cancel order')],
        ),
        Semantics(liveRegion: true, child: Text(_status)),
        Modal(
          open: _open,
          close: _close,
          label: 'Cancel order #10482?',
          showClose: false,
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              spacing: 16,
              children: [
                Semantics(
                  header: true,
                  // A dialog `h2`: 500 weight, -0.035em, line-height round(1.12em, 1px).
                  child: const Text(
                    'Cancel order #10482?',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w500,
                      letterSpacing: 18 * -0.035,
                      height: 20 / 18,
                    ),
                  ),
                ),
                const Text(
                  'The customer won’t be called again and the reserved stock goes back to inventory.',
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
                      onClick: () {
                        setState(() => _status = 'Order #10482 was cancelled.');
                        _close();
                      },
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
