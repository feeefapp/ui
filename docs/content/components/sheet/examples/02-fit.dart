import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class ContactSheet extends StatefulWidget {
  const ContactSheet({super.key});

  @override
  State<ContactSheet> createState() => _ContactSheetState();
}

class _ContactSheetState extends State<ContactSheet> {
  bool _open = false;
  String _last = 'No action yet.';

  void _act(String what) => setState(() {
    _last = what;
    _open = false;
  });

  @override
  Widget build(BuildContext context) {
    final c = ThemeProvider.of(context).colors;
    return _Device(
      label: 'A phone with a contact sheet',
      height: 640,
      child: Stack(
        children: [
          // `.demo-sheet-page`: the page, its content centred.
          Positioned.fill(
            child: ColoredBox(
              color: c.surface,
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  spacing: 16,
                  children: [
                    const Text(
                      'Amina Benali · 0555 12 34 56',
                      textAlign: TextAlign.center,
                    ),
                    Button(
                      variant: .filled,
                      onClick: () => setState(() => _open = true),
                      children: const [
                        LucideIcon(LucideIcons.phone, size: 18),
                        Text('Contact customer'),
                      ],
                    ),
                    Semantics(
                      liveRegion: true,
                      child: Text(
                        _last,
                        textAlign: TextAlign.center,
                        style: TextStyle(color: c.muted),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          Positioned.fill(
            child: Sheet(
              open: _open,
              onOpenChange: (open) => setState(() => _open = open),
              label: 'Contact Amina Benali',
              title: const Text('Amina Benali'),
              container: true,
              detents: const [.fit],
              child: ListSection(
                children: [
                  ListRow(
                    leading: const LucideIcon(LucideIcons.phone),
                    title: const Text('Call'),
                    subtitle: const Text('0555 12 34 56'),
                    onClick: () => _act('Calling…'),
                  ),
                  ListRow(
                    leading: const LucideIcon(LucideIcons.messageSquare),
                    title: const Text('Send SMS'),
                    onClick: () => _act('SMS sent.'),
                  ),
                  ListRow(
                    leading: const LucideIcon(LucideIcons.copy),
                    title: const Text('Copy number'),
                    onClick: () => _act('Number copied.'),
                  ),
                  ListRow(
                    leading: const LucideIcon(LucideIcons.phoneOff),
                    title: const Text('Mark as unreachable'),
                    onClick: () => _act('Marked unreachable.'),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// The docs' pretend phone (docs/src/blocks/device.tsx): lays [child] out at a real phone size and
/// scales the screen down to fit the column, centred.
class _Device extends StatelessWidget {
  const _Device({required this.label, this.height = 760, required this.child});
  final String label;
  final double height;
  final Widget child;

  static const _width = 390.0;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    return LayoutBuilder(
      builder: (context, constraints) {
        final available = constraints.maxWidth;
        final scale = available.isFinite
            ? (available / _width).clamp(0.0, 1.0)
            : 1.0;
        final radius = BorderRadius.circular(44 * theme.config.radiusScale);
        return SizedBox(
          width: available.isFinite ? available : _width,
          height: (height * scale).roundToDouble(),
          child: Center(
            child: Semantics(
              container: true,
              label: label,
              child: Transform.scale(
                scale: scale,
                child: OverflowBox(
                  minWidth: _width,
                  maxWidth: _width,
                  minHeight: height,
                  maxHeight: height,
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      borderRadius: radius,
                      boxShadow: const [
                        BoxShadow(
                          color: Color(0x59000000),
                          offset: Offset(0, 24),
                          blurRadius: 51,
                          spreadRadius: -32,
                        ),
                      ],
                    ),
                    child: ClipRRect(
                      borderRadius: radius,
                      child: ColoredBox(
                        color: theme.colors.ground,
                        child: child,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
