import 'dart:async';

import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

const _labels = ['Publish', 'Publishing…', 'Published'];

class StableTextExample extends StatefulWidget {
  const StableTextExample({super.key});

  @override
  State<StableTextExample> createState() => _StableTextExampleState();
}

class _StableTextExampleState extends State<StableTextExample> {
  int _step = 0;
  final _timers = <Timer>[];

  void _publish() {
    setState(() => _step = 1);
    _timers
      ..add(
        Timer(
          const Duration(milliseconds: 1200),
          () => setState(() => _step = 2),
        ),
      )
      ..add(
        Timer(
          const Duration(milliseconds: 2800),
          () => setState(() => _step = 0),
        ),
      );
  }

  @override
  void dispose() {
    for (final timer in _timers) {
      timer.cancel();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Wrap(
    spacing: 12,
    runSpacing: 12,
    alignment: WrapAlignment.center,
    crossAxisAlignment: WrapCrossAlignment.center,
    children: [
      Button(
        variant: .filled,
        loading: _step == 1,
        disabled: _step == 2,
        onClick: _publish,
        children: [StableText(value: _labels[_step], options: _labels)],
      ),
      Button(
        variant: .outlined,
        onClick: () {},
        children: const [Text('Preview')],
      ),
    ],
  );
}
