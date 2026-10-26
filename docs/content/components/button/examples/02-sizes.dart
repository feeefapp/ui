import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class Sizes extends StatelessWidget {
  const Sizes({super.key});

  @override
  Widget build(BuildContext context) => Wrap(
    spacing: 12,
    runSpacing: 12,
    alignment: WrapAlignment.center,
    crossAxisAlignment: WrapCrossAlignment.center,
    children: [
      Button(variant: .filled, controlSize: .small, onClick: () {}, children: const [Text('Small')]),
      Button(variant: .filled, onClick: () {}, children: const [Text('Regular')]),
      Button(variant: .filled, controlSize: .large, onClick: () {}, children: const [Text('Large')]),
      Button(variant: .text, controlSize: .inline, onClick: () {}, children: const [Text('Inline')]),
    ],
  );
}
