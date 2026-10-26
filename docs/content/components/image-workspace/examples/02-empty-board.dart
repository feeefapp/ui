import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

const _starters = [
  (
    label: 'Product on marble',
    prompt: 'A perfume bottle on white marble, soft studio light',
  ),
  (
    label: 'Flat lay',
    prompt: 'A flat lay of skincare products on a pastel background',
  ),
];

class EmptyBoard extends StatefulWidget {
  const EmptyBoard({super.key});

  @override
  State<EmptyBoard> createState() => _EmptyBoardState();
}

class _EmptyBoardState extends State<EmptyBoard> {
  String _prompt = '';

  @override
  Widget build(BuildContext context) {
    final c = ThemeProvider.of(context).colors;
    return SizedBox(
      width: 560,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 8,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: SizedBox(
              height: 320,
              child: FreeformBoard(
                embedded: true,
                takes: const [],
                selectedId: null,
                onSelect: (_) {},
                insets: (top: 12, right: 12, bottom: 12, left: 12),
                now: DateTime.now().millisecondsSinceEpoch,
                signedIn: true,
                starters: _starters,
                onStarter: (prompt) => setState(() => _prompt = prompt),
                onRetry: (_) {},
                onRemove: (_) {},
              ),
            ),
          ),
          // `<small>`: the stage text, a size smaller.
          Text(
            _prompt.isNotEmpty ? 'Starter: $_prompt' : 'Pick a starter.',
            style: TextStyle(fontSize: 15 / 1.2, color: c.ink),
          ),
        ],
      ),
    );
  }
}
