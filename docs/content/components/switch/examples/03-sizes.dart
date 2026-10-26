import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class Sizes extends StatelessWidget {
  const Sizes({super.key});

  @override
  Widget build(BuildContext context) => const Wrap(
    spacing: 12,
    runSpacing: 12,
    alignment: WrapAlignment.center,
    crossAxisAlignment: WrapCrossAlignment.center,
    children: [
      SlideSwitch(label: 'Regular', defaultChecked: true),
      SlideSwitch(label: 'Thin', trackStyle: .thin, defaultChecked: true),
      SlideSwitch(
        label: 'With text',
        defaultChecked: true,
        onText: 'On',
        offText: 'Off',
      ),
      SlideSwitch(label: 'Disabled', disabled: true),
    ],
  );
}
