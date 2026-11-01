import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

import '../layout/size_reporter.dart';
import 'freeform_board.dart' show Insets;

export 'freeform_board.dart' show Insets;

/// Bounded Lab canvas with measured floating chrome and a 12px edge inset: the twin of
/// `ImageWorkspace` in `@feeef.dev/ui/image/workspace`. It fills its parent (give it a bounded
/// size); [top] floats 12px from the top and inline start, [bottom] 12px from the bottom, centred
/// and at most 780px wide. Both are measured, and [board] gets their heights plus 24px.
class ImageWorkspace extends StatefulWidget {
  const ImageWorkspace({
    super.key,
    required this.top,
    required this.bottom,
    required this.board,
  });

  /// Floating chrome along the top edge (title, project actions). Measured.
  final Widget top;

  /// Floating chrome along the bottom edge, usually the prompt composer (max 780px wide).
  /// Measured.
  final Widget bottom;

  /// Renders the canvas behind the chrome; receives the room the chrome takes on each edge.
  final Widget Function(Insets insets) board;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties.add(
      ObjectFlagProperty<Widget Function(Insets insets)>.has('board', board),
    );
  }

  @override
  State<ImageWorkspace> createState() => _ImageWorkspaceState();
}

class _ImageWorkspaceState extends State<ImageWorkspace> {
  Insets _insets = (top: 80, bottom: 120, left: 12, right: 12);

  void _measure({double? top, double? bottom}) {
    if (!mounted) return;
    final next = (
      top: top == null ? _insets.top : top + 24,
      bottom: bottom == null ? _insets.bottom : bottom + 24,
      left: _insets.left,
      right: _insets.right,
    );
    if (next != _insets) setState(() => _insets = next);
  }

  @override
  Widget build(BuildContext context) => ClipRect(
    child: Stack(
      fit: StackFit.expand,
      children: [
        Positioned.fill(child: widget.board(_insets)),
        Positioned(
          top: 12,
          left: 12,
          right: 12,
          child: Align(
            alignment: AlignmentDirectional.topStart,
            child: SizeReporter(
              onSize: (size) => _measure(top: size.height),
              child: widget.top,
            ),
          ),
        ),
        Positioned(
          left: 12,
          right: 12,
          bottom: 12,
          child: Center(
            heightFactor: 1,
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 780),
              child: SizedBox(
                width: double.infinity,
                child: SizeReporter(
                  onSize: (size) => _measure(bottom: size.height),
                  child: widget.bottom,
                ),
              ),
            ),
          ),
        ),
      ],
    ),
  );
}
