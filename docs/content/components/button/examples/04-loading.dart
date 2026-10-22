import 'dart:async';

import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class Loading extends StatefulWidget {
  const Loading({super.key});

  @override
  State<Loading> createState() => _LoadingState();
}

class _LoadingState extends State<Loading> {
  bool saving = false;
  Timer? timer;

  void save() {
    setState(() => saving = true);
    timer = Timer(const Duration(milliseconds: 1600), () => setState(() => saving = false));
  }

  @override
  void dispose() {
    timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Wrap(
    spacing: 12,
    runSpacing: 12,
    alignment: WrapAlignment.center,
    children: [
      Button(
        variant: .filled,
        loading: saving,
        onClick: save,
        children: [Text(saving ? 'Saving…' : 'Save')],
      ),
      const Button(variant: .elevated, disabled: true, children: [Text('Disabled')]),
    ],
  );
}
