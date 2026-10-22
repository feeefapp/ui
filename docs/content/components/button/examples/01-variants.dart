import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class Variants extends StatelessWidget {
  const Variants({super.key});

  @override
  Widget build(BuildContext context) => Wrap(
    spacing: 12,
    runSpacing: 12,
    alignment: WrapAlignment.center,
    children: [
      Button(variant: .filled, onClick: () {}, children: const [Text('Filled')]),
      Button(variant: .tonal, onClick: () {}, children: const [Text('Tonal')]),
      Button(variant: .elevated, onClick: () {}, children: const [Text('Elevated')]),
      Button(variant: .outlined, onClick: () {}, children: const [Text('Outlined')]),
      Button(variant: .text, onClick: () {}, children: const [Text('Text')]),
      Button(variant: .ghost, onClick: () {}, children: const [Text('Ghost')]),
      Button(variant: .destructive, onClick: () {}, children: const [Text('Delete')]),
    ],
  );
}
