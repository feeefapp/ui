import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart' hide Action;

class WidthProvider extends StatelessWidget {
  const WidthProvider({super.key});

  static final List<Action> _actions = [
    CommandAction(
      id: 'delete',
      label: 'Delete',
      icon: const LucideIcon(LucideIcons.trash2),
      destructive: true,
      priority: -1,
      onAction: () {},
    ),
    CommandAction(
      id: 'copy',
      label: 'Copy link',
      icon: const LucideIcon(LucideIcons.copy),
      onAction: () {},
    ),
    CommandAction(
      id: 'share',
      label: 'Share',
      icon: const LucideIcon(LucideIcons.share2),
      priority: 1,
      onAction: () {},
    ),
    CommandAction(
      id: 'edit',
      label: 'Edit',
      icon: const LucideIcon(LucideIcons.pencil),
      variant: .tonal,
      priority: 5,
      onAction: () {},
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final c = ThemeProvider.of(context).colors;
    return Container(
      padding: const EdgeInsets.all(9),
      decoration: BoxDecoration(
        border: Border.all(color: c.line),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        spacing: 12,
        children: [
          const Text(
            'Summer sale page',
            style: TextStyle(fontWeight: FontWeight.w700),
          ),
          ActionsWidthProvider(
            value: 220,
            child: ActionsBar(
              label: 'Page actions',
              actions: _actions,
              size: .compact,
            ),
          ),
        ],
      ),
    );
  }
}
