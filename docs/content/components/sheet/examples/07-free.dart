import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

const _places = [
  'Bab Ezzouar',
  'Hussein Dey',
  'Kouba',
  'El Biar',
  'Hydra',
  'Bir Mourad Raïs',
  'Cheraga',
];

class FreeSheet extends StatefulWidget {
  const FreeSheet({super.key});

  @override
  State<FreeSheet> createState() => _FreeSheetState();
}

class _FreeSheetState extends State<FreeSheet> {
  int _count = 3;

  @override
  Widget build(BuildContext context) => _Device(
    tablet: false,
    label: 'A phone with a map and a free-moving sheet',
    child: Stack(
      children: [
        const Positioned.fill(child: _DemoMap()),
        Positioned.fill(
          child: Sheet(
            label: 'Route',
            container: true,
            detents: const [.peek, .fit],
            snap: false,
            modal: false,
            dismissible: false,
            header: const Padding(
              padding: EdgeInsets.symmetric(horizontal: 4),
              child: TextField(
                variant: .tonal,
                placeholder: 'Search stops',
                ariaLabel: 'Search stops',
                leadingIcon: LucideIcon(LucideIcons.search, size: 18),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(8, 0, 8, 8),
                  child: SegmentedControl<int>(
                    label: 'Stops',
                    value: _count,
                    onChange: (value) => setState(() => _count = value),
                    options: const [
                      SegmentOption(value: 3, label: '3 stops'),
                      SegmentOption(value: 6, label: '6 stops'),
                      SegmentOption(value: 14, label: '14 stops'),
                    ],
                  ),
                ),
                ListSection(
                  header: const Text('Today’s route'),
                  footer: const Text(
                    'Scroll the list: the sheet grows first, then the list scrolls.',
                  ),
                  children: [
                    for (var i = 0; i < _count; i++)
                      ListRow(
                        leading: const LucideIcon(LucideIcons.mapPin, size: 18),
                        title: Text(
                          'Stop ${i + 1} · ${_places[i % _places.length]}',
                        ),
                        subtitle: Text(
                          '${2 + i % 5} orders · ${(i + 1) * 7} min',
                        ),
                        onClick: () {},
                      ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ],
    ),
  );
}

/// The docs' pretend screen (docs/src/blocks/device.tsx): lays [child] out at a real phone or
/// tablet size and scales the screen down to fit the column, centred.
class _Device extends StatelessWidget {
  const _Device({
    required this.label,
    required this.child,
    required this.tablet,
  });
  final String label;
  final bool tablet;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final width = tablet ? 820.0 : 390.0;
    final height = tablet ? 640.0 : 760.0;
    return LayoutBuilder(
      builder: (context, constraints) {
        final available = constraints.maxWidth;
        final scale = available.isFinite
            ? (available / width).clamp(0.0, 1.0)
            : 1.0;
        final radius = BorderRadius.circular(
          (tablet ? 28 : 44) * theme.config.radiusScale,
        );
        return SizedBox(
          width: available.isFinite ? available : width,
          height: (height * scale).roundToDouble(),
          child: Center(
            child: Semantics(
              container: true,
              label: label,
              child: Transform.scale(
                scale: scale,
                child: OverflowBox(
                  minWidth: width,
                  maxWidth: width,
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

/// A pretend street map for sheet demos (docs `DemoMap`): colourful enough to show the glass.
class _DemoMap extends StatelessWidget {
  const _DemoMap();

  @override
  Widget build(BuildContext context) => ExcludeSemantics(
    child: CustomPaint(
      painter: _MapPainter(
        dark: ThemeProvider.of(context).brightness == Brightness.dark,
      ),
      child: const SizedBox.expand(),
    ),
  );
}

class _MapPainter extends CustomPainter {
  const _MapPainter({required this.dark});
  final bool dark;

  // Dark: the web demo inverts the map; these are the same colours, darkened.
  Color _c(int light, int night) => Color(dark ? night : light);

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width, h = size.height;
    canvas.drawRect(
      Offset.zero & size,
      Paint()..color = _c(0xFFECE6DB, 0xFF22252B),
    );
    final water = Paint()..color = _c(0xFF8EC5FF, 0xFF1F3C5C);
    final park = Paint()..color = _c(0xFFA8DCA0, 0xFF2B4A2B);
    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(w * 0.85, h * 0.08),
        width: w * 0.72,
        height: h * 0.48,
      ),
      water,
    );
    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(w * 0.18, h * 0.62),
        width: w * 0.36,
        height: h * 0.26,
      ),
      park,
    );
    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(w * 0.7, h * 0.82),
        width: w * 0.31,
        height: h * 0.22,
      ),
      park,
    );
    final street = Paint()..color = _c(0xE6FFFFFF, 0xE6393D45);
    for (var y = 46.0; y < h; y += 50) {
      canvas.drawRect(Rect.fromLTWH(0, y, w, 4), street);
    }
    for (var x = 58.0; x < w; x += 62) {
      canvas.drawRect(Rect.fromLTWH(x, 0, 4, h), street);
    }
    canvas.drawLine(
      Offset(0, h * 0.78),
      Offset(w, h * 0.22),
      Paint()
        ..color = _c(0xFFFFD479, 0xFF8A6A1E)
        ..strokeWidth = 12,
    );
    canvas.drawLine(
      Offset(w * 0.1, 0),
      Offset(w * 0.9, h),
      Paint()
        ..color = _c(0xFFFFFFFF, 0xFF44484F)
        ..strokeWidth = 7,
    );
    for (final (x, y) in const [
      (0.22, 0.18),
      (0.64, 0.30),
      (0.40, 0.46),
      (0.78, 0.58),
    ]) {
      final c = Offset(w * x + 9, h * y + 9);
      canvas.drawCircle(
        c + const Offset(0, 2),
        10,
        Paint()
          ..color = const Color(0x4D000000)
          ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 3),
      );
      canvas.drawCircle(c, 9, Paint()..color = const Color(0xFFFFFFFF));
      canvas.drawCircle(c, 6, Paint()..color = const Color(0xFFE5484D));
    }
  }

  @override
  bool shouldRepaint(_MapPainter old) => old.dark != dark;
}
