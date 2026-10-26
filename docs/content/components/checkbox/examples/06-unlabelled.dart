import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class Unlabelled extends StatefulWidget {
  const Unlabelled({super.key});

  @override
  State<Unlabelled> createState() => _UnlabelledState();
}

class _UnlabelledState extends State<Unlabelled> {
  bool selected = true;

  @override
  Widget build(BuildContext context) => Wrap(
    spacing: 12,
    runSpacing: 12,
    alignment: WrapAlignment.center,
    crossAxisAlignment: WrapCrossAlignment.center,
    children: [
      Checkbox(
        ariaLabel: 'Select order #10234',
        checked: selected,
        onCheckedChange: (value) => setState(() => selected = value),
      ),
      const Checkbox(ariaLabel: 'Select order #10235'),
      const Checkbox(ariaLabel: 'Select order #10236', controlSize: .small),
    ],
  );
}
