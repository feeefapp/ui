import 'dart:async';

import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart' hide Action;

Future<void> _wait(int ms) => Future.delayed(Duration(milliseconds: ms));

class Async extends StatefulWidget {
  const Async({super.key});

  @override
  State<Async> createState() => _AsyncState();
}

class _AsyncState extends State<Async> {
  String _log = '';

  late final List<Action> _actions = [
    CommandAction(
      id: 'sync',
      label: 'Sync with courier',
      icon: const LucideIcon(LucideIcons.refreshCw),
      onAction: () async {
        await _wait(1500);
        if (mounted) setState(() => _log = 'Statuses updated from ZR Express.');
      },
    ),
    CommandAction(
      id: 'print',
      label: 'Print labels',
      icon: const LucideIcon(LucideIcons.printer),
      variant: .filled,
      onAction: () async {
        await _wait(800);
        throw Exception('Printer offline');
      },
    ),
  ];

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 560,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 12,
      children: [
        ActionsBar(
          label: 'Shipping actions',
          actions: _actions,
          onActionError: (error, action) => setState(
            () => _log =
                '${action.label}: ${error is Exception ? '$error'.replaceFirst('Exception: ', '') : 'failed'}',
          ),
        ),
        Semantics(
          liveRegion: true,
          // An empty `<p>` is 0px tall.
          child: _log.isEmpty
              ? const SizedBox(width: double.infinity)
              : Text(_log),
        ),
      ],
    ),
  );
}
