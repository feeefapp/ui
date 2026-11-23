import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

final _lines = List.generate(
  12,
  (i) => 'Line ${i + 1} · Wireless earbuds × ${i + 1}',
);

class RenderViewport extends StatefulWidget {
  const RenderViewport({super.key});

  @override
  State<RenderViewport> createState() => _RenderViewportState();
}

class _RenderViewportState extends State<RenderViewport> {
  final _viewport = ScrollController();
  final _last = GlobalKey();

  @override
  void dispose() {
    _viewport.dispose();
    super.dispose();
  }

  void _jumpToTotal() {
    final target = _last.currentContext;
    if (target == null) return;
    final reduced = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
    Scrollable.ensureVisible(
      target,
      alignment: 1,
      duration: reduced ? Duration.zero : const Duration(milliseconds: 300),
      curve: Curves.easeOut,
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final row = BoxDecoration(
      color: c.surface,
      border: Border.all(color: c.line),
      borderRadius: BorderRadius.circular(theme.sizes.radiusSmall),
    );
    return _Frame(
      child: Scaffold(
        extendBodyBehindSidebar: true,
        side: const ScaffoldSide(child: Text('Invoices')),
        appBar: const ScaffoldAppBar(
          child: ToolbarGroup(
            label: 'Current page',
            children: [
              Padding(
                padding: EdgeInsets.symmetric(horizontal: 12),
                child: Text(
                  'Invoice #2210',
                  maxLines: 1,
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
        ),
        bottom: Dock(
          label: 'Invoice actions',
          children: [
            Button(
              variant: .tonal,
              onClick: _jumpToTotal,
              children: const [
                LucideIcon(LucideIcons.arrowDown),
                Text('Jump to total'),
              ],
            ),
          ],
        ),
        // The editor owns its scroll area (and its controller), and floats the scaffold's chrome
        // itself.
        renderViewport: (context, appBar, bottom) => ScrollArea(
          label: 'Invoice lines',
          controller: _viewport,
          contentPadding: 16,
          top: appBar,
          bottom: bottom,
          child: DefaultTextStyle.merge(
            style: const TextStyle(fontSize: 13),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              spacing: 8,
              children: [
                for (final line in _lines)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 12,
                    ),
                    decoration: row,
                    child: Text(line),
                  ),
                Container(
                  key: _last,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 12,
                  ),
                  decoration: row,
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    spacing: 12,
                    children: [
                      Text(
                        'Total',
                        style: TextStyle(fontWeight: FontWeight.w700),
                      ),
                      Text(
                        '38 400 DA',
                        style: TextStyle(fontWeight: FontWeight.w700),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// `.scaffold-demo-frame`: a scaffold fills its parent, so the demo gets a bounded box.
class _Frame extends StatelessWidget {
  const _Frame({required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final radius = BorderRadius.circular(theme.sizes.radiusPanel);
    return Container(
      width: double.infinity,
      height: 420,
      foregroundDecoration: BoxDecoration(
        border: Border.all(color: theme.colors.line),
        borderRadius: radius,
      ),
      decoration: BoxDecoration(
        color: theme.colors.ground,
        borderRadius: radius,
      ),
      clipBehavior: Clip.antiAlias,
      child: Padding(padding: const EdgeInsets.all(1), child: child),
    );
  }
}
