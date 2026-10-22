import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

const _variants = PixelVariant.values;

class ArtworkVariants extends StatelessWidget {
  const ArtworkVariants({super.key});

  @override
  Widget build(BuildContext context) => Wrap(
    spacing: 32,
    runSpacing: 32,
    alignment: WrapAlignment.center,
    crossAxisAlignment: WrapCrossAlignment.center,
    children: [
      for (final variant in _variants)
        Column(
          mainAxisSize: MainAxisSize.min,
          spacing: 8,
          children: [
            PixelArtwork(
              variant: variant,
              seed: 'spring-collection',
              size: 64,
              tone: .sage,
            ),
            // `<code>`: the browser's monospace at 13px.
            Text(
              variant.name,
              style: const TextStyle(fontFamily: 'monospace', fontSize: 13),
            ),
          ],
        ),
    ],
  );
}
