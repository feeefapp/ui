import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class IconButtons extends StatelessWidget {
  const IconButtons({super.key});

  @override
  Widget build(BuildContext context) => Wrap(
    spacing: 12,
    runSpacing: 12,
    alignment: WrapAlignment.center,
    crossAxisAlignment: WrapCrossAlignment.center,
    children: [
      IconButton(
        variant: .text,
        ariaLabel: 'Notifications',
        onClick: () {},
        icon: const LucideIcon(LucideIcons.bell),
      ),
      IconButton(
        variant: .elevated,
        ariaLabel: 'Settings',
        onClick: () {},
        icon: const LucideIcon(LucideIcons.settings),
      ),
      IconButton(
        variant: .tonal,
        ariaLabel: 'More actions',
        onClick: () {},
        icon: const LucideIcon(LucideIcons.ellipsis),
      ),
      IconButton(
        variant: .destructive,
        controlSize: .compact,
        ariaLabel: 'Delete',
        onClick: () {},
        icon: const LucideIcon(LucideIcons.trash2),
      ),
    ],
  );
}
