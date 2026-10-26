import 'dart:async';
import 'dart:math';

import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class Saving extends StatefulWidget {
  const Saving({super.key});

  @override
  State<Saving> createState() => _SavingState();
}

class _SavingState extends State<Saving> {
  bool active = false;
  bool saving = false;
  String message = '';
  Timer? _save;

  @override
  void dispose() {
    _save?.cancel();
    super.dispose();
  }

  void _commit(bool next) {
    setState(() {
      active = next;
      saving = true;
      message = '';
    });
    _save?.cancel();
    _save = Timer(const Duration(milliseconds: 900), () {
      final failed = next && Random().nextDouble() < 0.3;
      setState(() {
        if (failed) {
          active = !next;
          message = 'Could not reach Meta. Try again in a minute.';
        } else {
          message = next ? 'Pixel is tracking orders.' : 'Pixel turned off.';
        }
        saving = false;
      });
    });
  }

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 360,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 16,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          spacing: 16,
          children: [
            const ExcludeSemantics(child: Text('Meta pixel')),
            SlideSwitch(
              label: 'Meta pixel',
              checked: active,
              loading: saving,
              onCheckedCommit: _commit,
            ),
          ],
        ),
        // The status paragraph, announced politely (`.lab-app p` has no margins).
        Semantics(
          liveRegion: true,
          child: message.isEmpty ? const SizedBox.shrink() : Text(message),
        ),
      ],
    ),
  );
}
