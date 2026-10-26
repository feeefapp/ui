import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class Segments extends StatefulWidget {
  const Segments({super.key});

  @override
  State<Segments> createState() => _SegmentsState();
}

class _SegmentsState extends State<Segments> {
  bool _bold = false;
  bool _italic = false;

  @override
  Widget build(BuildContext context) => _Surface(
    child: Toolbar(
      label: 'Product description editor',
      leading: Row(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ToolbarGroup(
            label: 'History',
            children: [
              IconButton(
                variant: .text,
                appearance: .toolbar,
                ariaLabel: 'Undo',
                onClick: () {},
                icon: const LucideIcon(LucideIcons.undo2),
              ),
              const IconButton(
                variant: .text,
                appearance: .toolbar,
                ariaLabel: 'Redo',
                disabled: true,
                icon: LucideIcon(LucideIcons.redo2),
              ),
            ],
          ),
          Padding(
            padding: const EdgeInsetsDirectional.only(start: 8),
            child: ToolbarGroup(
              label: 'Text style',
              children: [
                IconButton(
                  variant: .text,
                  appearance: .toolbar,
                  ariaLabel: 'Bold',
                  pressed: _bold,
                  onClick: () => setState(() => _bold = !_bold),
                  icon: const LucideIcon(LucideIcons.bold),
                ),
                IconButton(
                  variant: .text,
                  appearance: .toolbar,
                  ariaLabel: 'Italic',
                  pressed: _italic,
                  onClick: () => setState(() => _italic = !_italic),
                  icon: const LucideIcon(LucideIcons.italic),
                ),
                IconButton(
                  variant: .text,
                  appearance: .toolbar,
                  ariaLabel: 'Insert link',
                  onClick: () {},
                  icon: const LucideIcon(LucideIcons.link2),
                ),
              ],
            ),
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
            children: const [Text('Save')],
          ),
        ],
      ),
    ),
  );
}

/// `.toolbar-demo-surface`: toolbars float over content, so the demo gives them some.
class _Surface extends StatelessWidget {
  const _Surface({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: ShapeDecoration(
        color: theme.colors.surface,
        // A plain rounded rectangle (no corner-shape in the demo CSS).
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(theme.sizes.radiusPanel),
          side: BorderSide(color: theme.colors.line),
        ),
      ),
      child: child,
    );
  }
}
