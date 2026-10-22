import 'package:feeef_ui/brand/pixel_art.dart';
import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

typedef _Block = ({String id, String speaker, String text});

const List<_Block> _initial = [
  (
    id: 'intro',
    speaker: 'Amina',
    text: 'Your order is on its way. Expect a call from the courier today.',
  ),
  (id: 'reply', speaker: 'Yacine', text: 'Can I pay when it arrives?'),
  (
    id: 'close',
    speaker: 'Amina',
    text: 'Yes, cash on delivery. Thank you for shopping with us.',
  ),
];

class Script extends StatefulWidget {
  const Script({super.key});

  @override
  State<Script> createState() => _ScriptState();
}

class _ScriptState extends State<Script> {
  List<_Block> _blocks = _initial;

  void _edit(String id, String text) => setState(
    () => _blocks = [
      for (final b in _blocks)
        b.id == id ? (id: b.id, speaker: b.speaker, text: text) : b,
    ],
  );

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 560,
    // `.lab-voice-writing`: the blocks are siblings, so they can reorder.
    child: SpeechReorderGroup(
      spacing: 8,
      children: [
        for (final (index, block) in _blocks.indexed)
          SpeechBlock(
            key: ValueKey(block.id),
            seed: block.id,
            index: index,
            count: _blocks.length,
            onMove: (from, to) =>
                setState(() => _blocks = moveSpeechBlock(_blocks, from, to)),
            // The toolbar row's own 2px gap (`.lab-speech-block-toolbar`).
            toolbar: Row(
              spacing: 2,
              children: [
                PixelArtwork(variant: .voice, seed: block.speaker, size: 24),
                Expanded(
                  child: Text(
                    block.speaker,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                IconButton(
                  variant: .ghost,
                  appearance: .toolbar,
                  controlSize: .compact,
                  ariaLabel: 'Delete block ${index + 1}',
                  disabled: _blocks.length == 1,
                  onClick: () => setState(
                    () => _blocks = [
                      for (final b in _blocks)
                        if (b.id != block.id) b,
                    ],
                  ),
                  icon: const LucideIcon(LucideIcons.trash2),
                ),
              ],
            ),
            child: _ScriptField(
              label: 'Speech for block ${index + 1}',
              value: block.text,
              onValueChange: (text) => _edit(block.id, text),
            ),
          ),
      ],
    ),
  );
}

/// `RawInput className="lab-textarea"` with the inline style: the theme's 13/20 text, field
/// height and inner top highlight on a control-radius shape, no border or fill, 4px 6px padding.
class _ScriptField extends StatelessWidget {
  const _ScriptField({
    required this.label,
    required this.value,
    required this.onValueChange,
  });
  final String label, value;
  final ValueChanged<String> onValueChange;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    // `--lab-field-height`: 40px, or the control height in the denser themes.
    final fieldHeight = theme.config.density == Density.comfortable
        ? 40.0
        : theme.sizes.controlHeight;
    return CustomPaint(
      foregroundPainter: _TopEdge(
        color: theme.colors.glassEdgeLow,
        radius: theme.sizes.radiusControl,
      ),
      child: ConstrainedBox(
        constraints: BoxConstraints(minHeight: fieldHeight),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 6),
          child: RawInput(
            multiline: true,
            label: label,
            value: value,
            onValueChange: (text) {
              SpeechBlock.noteInput(context);
              onValueChange(text);
            },
            style: const TextStyle(fontSize: 13, height: 20 / 13),
          ),
        ),
      ),
    );
  }
}

/// `box-shadow: inset 0 1px 0 var(--lab-glass-edge-low)` on the field's corner shape.
class _TopEdge extends CustomPainter {
  const _TopEdge({required this.color, required this.radius});
  final Color color;
  final double radius;

  @override
  void paint(Canvas canvas, Size size) {
    final shape = SuperellipseBorder(radius: radius);
    final outer = shape.getOuterPath(Offset.zero & size);
    final lowered = shape.getOuterPath(const Offset(0, 1) & size);
    canvas.drawPath(
      Path.combine(PathOperation.difference, outer, lowered),
      Paint()..color = color,
    );
  }

  @override
  bool shouldRepaint(_TopEdge old) =>
      old.color != color || old.radius != radius;
}
