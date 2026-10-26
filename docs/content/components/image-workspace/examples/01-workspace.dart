import 'dart:async';

import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

/// The demo art: a circle on a pale ground (the web example's SVG data URL).
const _fills = {'take-2': Color(0xFF6F8965), 'take-1': Color(0xFFC08A5B)};

ImageTake _take(String id, TakeStatus status, String aspectRatio) => ImageTake(
  id: id,
  operation: .generate,
  status: status,
  error: status == .failed ? 'The model did not return an image.' : null,
  createdAt: DateTime.now().toUtc().toIso8601String(),
  prompt: 'A ceramic vase on linen, soft window light',
  model: 'imagen-standard',
  options: ImageOptions(aspectRatio: aspectRatio),
  kind: .image,
);

class Workspace extends StatefulWidget {
  const Workspace({super.key});

  @override
  State<Workspace> createState() => _WorkspaceState();
}

class _WorkspaceState extends State<Workspace> {
  // Newest first.
  late List<ImageTake> _takes = [
    _take('take-3', .processing, '1:1'),
    _take('take-2', .completed, '4:5'),
    _take('take-1', .completed, '1:1'),
  ];
  String? _selected;
  String _prompt = '';
  int _now = DateTime.now().millisecondsSinceEpoch;
  late final Timer _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(
      const Duration(seconds: 1),
      (_) => setState(() => _now = DateTime.now().millisecondsSinceEpoch),
    );
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: SizedBox(
        width: double.infinity,
        height: 520,
        child: ImageWorkspace(
          top: const GlassGroup(
            padding: EdgeInsets.symmetric(vertical: 8, horizontal: 14),
            child: Text(
              'Vase campaign',
              style: TextStyle(fontWeight: FontWeight.w700),
            ),
          ),
          bottom: PromptComposer(
            label: 'Describe a change',
            placeholder: 'Make the light warmer',
            value: _prompt,
            onValueChange: (value) => setState(() => _prompt = value),
            onSubmit: () => setState(() => _prompt = ''),
            submitLabel: 'Create image',
          ),
          board: (insets) => FreeformBoard(
            embedded: true,
            takes: _takes,
            selectedId: _selected,
            onSelect: (id) => setState(() => _selected = id),
            insets: insets,
            now: _now,
            signedIn: true,
            starters: const [],
            onStarter: (prompt) => setState(() => _prompt = prompt),
            onRetry: (_) {},
            onRemove: (removed) => setState(
              () => _takes = [
                for (final take in _takes)
                  if (take.id != removed.id) take,
              ],
            ),
            imageBuilder: (context, take) => CustomPaint(
              painter: _Art(_fills[take.id] ?? const Color(0xFF6F8965)),
            ),
          ),
        ),
      ),
    );
  }
}

class _Art extends CustomPainter {
  _Art(this.fill);
  final Color fill;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawRect(
      Offset.zero & size,
      Paint()..color = const Color(0xFFE8EAE4),
    );
    canvas.drawCircle(
      size.center(Offset.zero),
      size.shortestSide / 3,
      Paint()..color = fill,
    );
  }

  @override
  bool shouldRepaint(_Art old) => old.fill != fill;
}
