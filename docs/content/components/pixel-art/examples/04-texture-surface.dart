import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class TextureSurface extends StatefulWidget {
  const TextureSurface({super.key});

  @override
  State<TextureSurface> createState() => _TextureSurfaceState();
}

class _TextureSurfaceState extends State<TextureSurface> {
  TextureDensity _density = .sparse;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final radius = BorderRadius.circular(theme.sizes.radiusPanel);
    return SizedBox(
      width: 360,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 16,
        children: [
          DecoratedBox(
            decoration: ShapeDecoration(
              color: ThemeProvider.of(context).colors.surfaceSoft,
              shape: SuperellipseBorder(
                radius: ThemeProvider.of(context).sizes.radiusControl,
              ),
            ),
            child: SegmentedControl<TextureDensity>(
              equalWidth: true,
              label: 'Texture density',
              value: _density,
              onChange: (value) => setState(() => _density = value),
              options: const [
                SegmentOption(value: .sparse, label: 'Sparse'),
                SegmentOption(value: .medium, label: 'Medium'),
                SegmentOption(value: .dense, label: 'Dense'),
              ],
            ),
          ),
          DecoratedBox(
            decoration: BoxDecoration(
              color: c.surface,
              border: Border.all(color: c.line),
              borderRadius: radius,
            ),
            child: Stack(
              children: [
                // The texture in its own clipped layer, behind the content.
                Positioned.fill(
                  child: ClipRRect(
                    borderRadius: radius,
                    child: PixelTexture(
                      variant: .corner,
                      seed: 'project_aurora',
                      density: _density,
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(21),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    spacing: 8,
                    children: [
                      const PixelArtwork(
                        variant: .orbit,
                        seed: 'project_aurora',
                        size: 40,
                        tone: .sage,
                      ),
                      const Text(
                        'Aurora landing page',
                        style: TextStyle(fontWeight: FontWeight.w700),
                      ),
                      Text(
                        'Edited 2 hours ago',
                        style: TextStyle(color: c.muted),
                      ),
                      Button(
                        variant: .tonal,
                        controlSize: .small,
                        onClick: () {},
                        children: const [Text('Open project')],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
