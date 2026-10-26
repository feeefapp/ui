import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class OnAButton extends StatelessWidget {
  const OnAButton({super.key});

  @override
  Widget build(BuildContext context) {
    const paid = false;
    return Wrap(
      spacing: 12,
      runSpacing: 12,
      alignment: WrapAlignment.center,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        Button(
          variant: .outlined,
          onClick: () {},
          children: const [
            LucideIcon(LucideIcons.mic),
            Text('Clone a voice'),
            if (!paid) ProBadge(),
          ],
        ),
        Button(
          variant: .outlined,
          onClick: () {},
          children: const [
            LucideIcon(LucideIcons.sparkles),
            Text('Design a voice'),
            if (!paid) ProBadge(),
          ],
        ),
      ],
    );
  }
}
