import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class SwapExample extends StatefulWidget {
  const SwapExample({super.key});

  @override
  State<SwapExample> createState() => _SwapExampleState();
}

class _SwapExampleState extends State<SwapExample> {
  bool _playing = false;

  @override
  Widget build(BuildContext context) => Wrap(
    spacing: 12,
    runSpacing: 12,
    alignment: WrapAlignment.center,
    crossAxisAlignment: WrapCrossAlignment.center,
    children: [
      IconButton(
        variant: .filled,
        ariaLabel: _playing ? 'Pause preview' : 'Play preview',
        pressed: _playing,
        onClick: () => setState(() => _playing = !_playing),
        icon: Swap(
          swapKey: _playing ? 'pause' : 'play',
          child: LucideIcon(_playing ? LucideIcons.pause : LucideIcons.play),
        ),
      ),
      Text(_playing ? 'Playing take 3' : 'Take 3 · 0:42'),
    ],
  );
}
