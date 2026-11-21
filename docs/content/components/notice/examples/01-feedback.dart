import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class InlineWarning extends StatelessWidget {
  const InlineWarning({super.key});

  @override
  Widget build(BuildContext context) => const Notice(
    tone: NoticeTone.warning,
    title: Text('Connection lost'),
    child: Text('Your draft is saved on this device.'),
  );
}
