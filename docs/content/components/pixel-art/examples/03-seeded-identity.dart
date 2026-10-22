import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

const _voices = [
  (id: 'voice_7f2a', name: 'Amina', style: 'Warm, conversational'),
  (id: 'voice_31c9', name: 'Yacine', style: 'Calm narrator'),
  (id: 'voice_b04e', name: 'Lina', style: 'Bright, energetic'),
];

class SeededIdentity extends StatelessWidget {
  const SeededIdentity({super.key});

  @override
  Widget build(BuildContext context) {
    final c = ThemeProvider.of(context).colors;
    return SizedBox(
      width: 360,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 16,
        children: [
          for (final voice in _voices)
            Row(
              spacing: 12,
              children: [
                PixelArtwork(variant: .voice, seed: voice.id, size: 40),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      voice.name,
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                    // `<small>`: 0.833em.
                    Text(
                      voice.style,
                      style: TextStyle(color: c.muted, fontSize: 12.5),
                    ),
                  ],
                ),
              ],
            ),
        ],
      ),
    );
  }
}
