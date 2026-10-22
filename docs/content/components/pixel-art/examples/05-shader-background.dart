import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class ShaderBackground extends StatelessWidget {
  const ShaderBackground({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final radius = BorderRadius.circular(theme.sizes.radiusPanel);
    return Container(
      width: 560,
      constraints: const BoxConstraints(minHeight: 220),
      decoration: BoxDecoration(
        color: c.surface,
        border: Border.all(color: c.line),
        borderRadius: radius,
      ),
      child: ClipRRect(
        borderRadius: radius,
        child: Stack(
          fit: StackFit.passthrough,
          children: [
            const Positioned.fill(
              child: PixelShader(density: 0.9, speed: 0.25),
            ),
            Padding(
              padding: const EdgeInsets.all(32),
              // A CSS grid in a min-height box: each row grows by an equal share of the spare
              // height, its item at the row's start.
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  // `<h3>`: 1.17em, bold.
                  const Padding(
                    padding: EdgeInsets.only(bottom: 12),
                    child: Text(
                      'Turn a script into a voiceover',
                      style: TextStyle(
                        fontSize: 17.55,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 360),
                      child: const Text(
                        'Write it once, pick a voice, and download the audio.',
                      ),
                    ),
                  ),
                  Button(
                    variant: .filled,
                    onClick: () {},
                    children: const [Text('Start a project')],
                  ),
                  const SizedBox.shrink(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
