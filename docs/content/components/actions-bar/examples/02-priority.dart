import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart' hide Action;

class Priority extends StatefulWidget {
  const Priority({super.key});

  @override
  State<Priority> createState() => _PriorityState();
}

class _PriorityState extends State<Priority> {
  double _width = 520;
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
      id: 'archive',
      label: 'Archive',
      icon: const LucideIcon(LucideIcons.archive),
      priority: 0,
      onAction: () {},
    ),
    CommandAction(
      id: 'duplicate',
      label: 'Duplicate',
      icon: const LucideIcon(LucideIcons.copy),
      priority: 0,
      onAction: () {},
    ),
    CommandAction(
      id: 'export',
      label: 'Export',
      icon: const LucideIcon(LucideIcons.download),
      priority: 2,
      onAction: () {},
    ),
    CommandAction(
      id: 'edit',
      label: 'Edit',
      icon: const LucideIcon(LucideIcons.pencil),
      priority: 5,
      onAction: () {},
    ),
    CommandAction(
      id: 'publish',
      label: 'Publish',
      icon: const LucideIcon(LucideIcons.send),
      variant: .filled,
      priority: 10,
      onAction: () {},
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final c = ThemeProvider.of(context).colors;
    return SizedBox(
      width: 560,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 16,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: 4,
            children: [
              ExcludeSemantics(child: Text('Width: ${_width.round()}px')),
              Slider(
                label: 'Bar width',
                min: 120,
                max: 560,
                step: 10,
                value: _width,
                onValueChange: (value) => setState(() => _width = value),
              ),
            ],
          ),
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: Container(
              width: _width,
              padding: const EdgeInsets.all(4),
              // A 1px dashed outline (outside the box, like CSS `outline`).
              foregroundDecoration: _DashedOutline(color: c.line),
              child: ActionsBar(label: 'Product actions', actions: _actions),
            ),
          ),
          const Text(
            'Priorities: Delete −1 · Archive 0 · Duplicate 0 · Export 2 · Edit 5 · Publish 10. '
            'Delete spills first, then Duplicate (the later of the two zeros), then Archive.',
            style: TextStyle(fontSize: 14),
          ),
        ],
      ),
    );
  }
}

class _DashedOutline extends Decoration {
  const _DashedOutline({required this.color});
  final Color color;

  @override
  BoxPainter createBoxPainter([VoidCallback? onChanged]) =>
      _DashedPainter(color);
}

class _DashedPainter extends BoxPainter {
  _DashedPainter(this.color);
  final Color color;

  @override
  void paint(Canvas canvas, Offset offset, ImageConfiguration configuration) {
    final rect = (offset & configuration.size!).inflate(0.5);
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke;
    final path = Path()
      ..addRRect(RRect.fromRectAndRadius(rect, const Radius.circular(12.5)));
    for (final metric in path.computeMetrics()) {
      for (var d = 0.0; d < metric.length; d += 6) {
        canvas.drawPath(metric.extractPath(d, d + 3), paint);
      }
    }
  }
}
