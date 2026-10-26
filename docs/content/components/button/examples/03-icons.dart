import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class WithIcons extends StatelessWidget {
  const WithIcons({super.key});

  @override
  Widget build(BuildContext context) => Wrap(
    spacing: 12,
    runSpacing: 12,
    alignment: WrapAlignment.center,
    children: [
      Button(
        variant: .filled,
        onClick: () {},
        children: const [LucideIcon(LucideIcons.plus), Text('New order')],
      ),
      Button(
        variant: .elevated,
        onClick: () {},
        children: const [LucideIcon(LucideIcons.download), Text('Export CSV')],
      ),
      Button(
        variant: .text,
        onClick: () {},
        children: const [Text('Continue'), LucideIcon(LucideIcons.arrowRight)],
      ),
    ],
  );
}
