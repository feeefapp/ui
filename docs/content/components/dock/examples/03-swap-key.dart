import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

const _orders = [
  '#1048 Amina B.',
  '#1047 Yacine H.',
  '#1046 Sara M.',
  '#1045 Karim S.',
  '#1044 Lina C.',
  '#1043 Omar B.',
];

class SwapKey extends StatefulWidget {
  const SwapKey({super.key});

  @override
  State<SwapKey> createState() => _SwapKeyState();
}

class _SwapKeyState extends State<SwapKey> {
  List<String> _selected = [];
  int _page = 1;

  void _toggle(String id) => setState(
    () => _selected = _selected.contains(id)
        ? _selected.where((x) => x != id).toList()
        : [..._selected, id],
  );

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final radius = BorderRadius.circular(theme.sizes.radiusPanel);
    final selecting = _selected.isNotEmpty;
    const row = (
      spacing: 12.0,
      runSpacing: 12.0,
      alignment: WrapAlignment.center,
      cross: WrapCrossAlignment.center,
    );
    return Container(
      // `.dock-demo-frame`
      width: double.infinity,
      height: 340,
      decoration: BoxDecoration(
        color: c.surface,
        border: Border.all(color: c.line),
        borderRadius: radius,
      ),
      child: ClipRRect(
        borderRadius: radius,
        child: ScrollArea(
          label: 'Orders',
          // Key the task (browsing vs selecting), not the count: count changes keep focus and state.
          bottom: Dock(
            label: selecting ? 'Selection actions' : 'Page navigation',
            swapKey: selecting ? 'selected' : 'browsing',
            content: selecting
                ? Text(
                    '${_selected.length} selected',
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  )
                : Text('Page $_page'),
            children: [
              Wrap(
                spacing: row.spacing,
                runSpacing: row.runSpacing,
                alignment: row.alignment,
                crossAxisAlignment: row.cross,
                children: selecting
                    ? [
                        IconButton(
                          variant: .text,
                          ariaLabel: 'Clear selection',
                          onClick: () => setState(() => _selected = []),
                          icon: const LucideIcon(LucideIcons.x),
                        ),
                        Button(
                          variant: .filled,
                          onClick: () {},
                          children: [
                            const LucideIcon(LucideIcons.truck),
                            Text('Ship ${_selected.length}'),
                          ],
                        ),
                      ]
                    : [
                        IconButton(
                          variant: .text,
                          ariaLabel: 'Previous page',
                          disabled: _page == 1,
                          onClick: () => setState(() => _page--),
                          icon: const LucideIcon(LucideIcons.arrowLeft),
                        ),
                        IconButton(
                          variant: .text,
                          ariaLabel: 'Next page',
                          onClick: () => setState(() => _page++),
                          icon: const LucideIcon(LucideIcons.arrowRight),
                        ),
                      ],
              ),
            ],
          ),
          child: Semantics(
            container: true,
            label: 'Select orders',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              spacing: 8,
              children: [
                for (final order in _orders)
                  _OrderRow(
                    label: order,
                    checked: _selected.contains(order),
                    onToggle: () => _toggle(order),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// `.dock-demo-row`: a label around a checkbox; selected rows take the primary edge.
class _OrderRow extends StatelessWidget {
  const _OrderRow({
    required this.label,
    required this.checked,
    required this.onToggle,
  });
  final String label;
  final bool checked;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    return Semantics(
      checked: checked,
      label: label,
      excludeSemantics: true,
      onTap: onToggle,
      child: MouseRegion(
        cursor: SystemMouseCursors.click,
        child: GestureDetector(
          onTap: onToggle,
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 14),
            decoration: BoxDecoration(
              color: checked ? c.controlSelected : null,
              border: Border.all(color: checked ? c.primary : c.line),
              borderRadius: BorderRadius.circular(theme.sizes.radiusSmall),
            ),
            child: Row(
              spacing: 12,
              children: [
                _NativeCheckbox(checked: checked, accent: c.primary),
                Text(label, style: const TextStyle(fontSize: 13)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// The browser's `<input type="checkbox">` with `accent-color: var(--lab-primary)`: 13px, 3px
/// margins (4px at the start).
class _NativeCheckbox extends StatelessWidget {
  const _NativeCheckbox({required this.checked, required this.accent});
  final bool checked;
  final Color accent;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsetsDirectional.fromSTEB(4, 3, 3, 3),
    child: SizedBox.square(
      dimension: 13,
      child: CustomPaint(
        painter: _CheckboxPainter(checked: checked, accent: accent),
      ),
    ),
  );
}

class _CheckboxPainter extends CustomPainter {
  _CheckboxPainter({required this.checked, required this.accent});
  final bool checked;
  final Color accent;

  @override
  void paint(Canvas canvas, Size size) {
    final box = RRect.fromRectAndRadius(
      (Offset.zero & size).deflate(0.5),
      const Radius.circular(2),
    );
    if (!checked) {
      canvas.drawRRect(box, Paint()..color = const Color(0xFFFFFFFF));
      canvas.drawRRect(
        box,
        Paint()
          ..color = const Color(0xFF767676)
          ..style = PaintingStyle.stroke,
      );
      return;
    }
    canvas.drawRRect(box.inflate(0.5), Paint()..color = accent);
    final ink = accent.computeLuminance() > 0.5
        ? const Color(0xFF000000)
        : const Color(0xFFFFFFFF);
    canvas.drawPath(
      Path()
        ..moveTo(size.width * 0.22, size.height * 0.52)
        ..lineTo(size.width * 0.42, size.height * 0.72)
        ..lineTo(size.width * 0.78, size.height * 0.3),
      Paint()
        ..color = ink
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.8,
    );
  }

  @override
  bool shouldRepaint(_CheckboxPainter old) =>
      old.checked != checked || old.accent != accent;
}
