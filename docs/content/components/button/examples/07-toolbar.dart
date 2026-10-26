import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class ToolbarAppearance extends StatelessWidget {
  const ToolbarAppearance({super.key});

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 560,
    child: Toolbar(
      label: 'Formatting',
      leading: ToolbarGroup(
        label: 'Text style',
        children: [
          IconButton(
            variant: .text,
            appearance: .toolbar,
            ariaLabel: 'Bold',
            pressed: true,
            onClick: () {},
            icon: const LucideIcon(LucideIcons.bold),
          ),
          IconButton(
            variant: .text,
            appearance: .toolbar,
            ariaLabel: 'Italic',
            onClick: () {},
            icon: const LucideIcon(LucideIcons.italic),
          ),
          IconButton(
            variant: .text,
            appearance: .toolbar,
            ariaLabel: 'Underline',
            onClick: () {},
            icon: const LucideIcon(LucideIcons.underline),
          ),
        ],
      ),
      trailing: ToolbarGroup(
        label: 'Document',
        children: [
          Button(
            variant: .filled,
            appearance: .toolbar,
            onClick: () {},
            children: const [Text('Publish')],
          ),
        ],
      ),
    ),
  );
}
