import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

const _stops = [
  LadderStop(
    modelId: 'google/gemini-flash-lite',
    modelName: 'Gemini Flash Lite',
    label: 'Fast',
    access: .free,
  ),
  LadderStop(
    modelId: 'openai/gpt-4.1-mini',
    modelName: 'GPT-4.1 mini',
    label: 'Everyday',
    access: .free,
  ),
  LadderStop(
    modelId: 'google/gemini-pro',
    modelName: 'Gemini Pro',
    label: 'Smart',
    access: .pro,
    priceUsd: 0.012,
  ),
  LadderStop(
    modelId: 'anthropic/claude-opus',
    modelName: 'Claude Opus',
    label: 'Best',
    access: .pro,
    priceUsd: 0.08,
  ),
];
final _default = middleIndex(_stops.length);

class Chip extends StatefulWidget {
  const Chip({super.key});

  @override
  State<Chip> createState() => _ChipState();
}

class _ChipState extends State<Chip> {
  int _index = _default;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 360,
    child: Column(
      spacing: 16,
      children: [
        ModelLadder(
          stops: _stops,
          index: _index,
          defaultIndex: _default,
          onChange: (index) => setState(() => _index = index),
          side: .bottom,
        ),
        // <small>: the browser's `smaller` step from the 15px page text.
        Text(
          'Requests use ${_stops[_index].modelId}',
          style: const TextStyle(fontSize: 12.5),
        ),
      ],
    ),
  );
}
