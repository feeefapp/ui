import 'dart:math' as math;

import 'package:flutter/widgets.dart';

import '../actions/actions_bar.dart';
import '../glass/container.dart';
import '../scaffold.dart';
import '../theme.dart';
import '../theme/tokens.dart';
import 'content_swap.dart';

/// How the dock sits in its host's width.
enum DockAlign { start, center, end, stretch }

/// Floating glass container for a status tile and its actions: the twin of `Dock` in
/// `@feeef.dev/ui/dock`. It hugs its content up to the host's width and animates size changes;
/// positioning and scroll reservations belong to its host.
class Dock extends StatefulWidget {
  const Dock({
    super.key,
    required this.label,
    this.content,
    required this.children,
    this.align = DockAlign.center,
    this.swapKey = 'default',
  });

  /// Accessible name of the dock group.
  final String label;

  /// A compact title/status tile. It may shrink; actions stay reachable.
  final Widget? content;

  /// The actions.
  final List<Widget> children;

  /// Bottom task actions stay centered by default. Override only for contextual chrome.
  final DockAlign align;

  /// Task identity, e.g. idle/selected; don't key every count or label change.
  final String swapKey;

  @override
  State<Dock> createState() => _DockState();
}

class _DockState extends State<Dock> {
  final _tileKey = GlobalKey();

  /// The tile's natural width, padding included (`useDockSize`'s `intrinsic`).
  double? _tileIntrinsic;

  void _measureTile() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final box = _tileKey.currentContext?.findRenderObject() as RenderBox?;
      if (box == null || !box.attached) return;
      final width = box.getMaxIntrinsicWidth(double.infinity).ceilToDouble();
      if (width != _tileIntrinsic) setState(() => _tileIntrinsic = width);
    });
  }

  @override
  Widget build(BuildContext context) {
    final content = widget.content;
    final children = widget.children;
    final align = widget.align;
    final swapKey = widget.swapKey;
    final label = widget.label;
    final theme = ThemeProvider.of(context);
    final narrow = (MediaQuery.maybeSizeOf(context)?.width ?? 1000) <= 420;
    final reduced = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
    return LayoutBuilder(
      builder: (context, constraints) {
        // 4px padding inside the 1px border on each side.
        final available = math.max(0.0, constraints.maxWidth - 10);
        // The 4px inset (`--lab-dock-inset`): never a gap wider than the padding around it.
        const gap = 4.0;
        // The tile takes its natural width, at most 40% of the room, and always leaves an
        // action's width; the actions get the rest.
        if (content != null) _measureTile();
        final tileMax = math.max(
          0.0,
          math.min(
            math.min(available * 0.4, _tileIntrinsic ?? double.infinity),
            available - 44 - gap,
          ),
        );
        // `.lab-dock-content` min-width (48px on narrow screens), which wins over its max.
        final tileMin = narrow ? 48.0 : 64.0;
        Widget row = Row(
          mainAxisSize: MainAxisSize.min,
          spacing: gap,
          children: [
            // The tile is bounded by tileMax and the actions by what it leaves, so neither has to
            // share a flex split (a Flexible tile would take half the row from the actions).
            if (content != null)
              ConstrainedBox(
                constraints: BoxConstraints(
                  minWidth: tileMin,
                  maxWidth: math.max(tileMin, tileMax),
                ),
                child: Padding(
                  // Measured unclamped, so a tile that was squeezed can grow back.
                  key: _tileKey,
                  padding: EdgeInsets.symmetric(horizontal: narrow ? 6 : 10),
                  child: DefaultTextStyle.merge(
                    style: const TextStyle(fontSize: 13),
                    maxLines: 1,
                    softWrap: false,
                    overflow: TextOverflow.ellipsis,
                    child: content,
                  ),
                ),
              ),
            Flexible(
              // An ActionsBar here fits the room the tile leaves.
              child: ActionsWidthProvider(
                value: math.max(
                  0.0,
                  available - (content == null ? 0 : tileMax + gap),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  spacing: 4,
                  children: children,
                ),
              ),
            ),
          ],
        );
        row = DockContentSwap(swapKey: swapKey, child: row);
        final dock = Semantics(
          container: true,
          explicitChildNodes: true,
          label: label,
          child: GlassGroup(
            glassMotion: GlassMotion.follow,
            radius: theme.sizes.radiusPanel,
            padding: const EdgeInsets.all(4),
            child: AnimatedSize(
              duration: reduced ? Duration.zero : MotionTokens.durationNormal,
              curve: MotionTokens.ease,
              alignment: Alignment.center,
              child: row,
            ),
          ),
        );
        return GlassScope(
          child: SizedBox(
            width: constraints.maxWidth.isFinite ? constraints.maxWidth : null,
            child: align == DockAlign.stretch
                ? dock
                : Align(
                    widthFactor: constraints.maxWidth.isFinite ? null : 1,
                    heightFactor: 1,
                    alignment: switch (align) {
                      DockAlign.start => AlignmentDirectional.centerStart,
                      DockAlign.end => AlignmentDirectional.centerEnd,
                      _ => AlignmentDirectional.center,
                    },
                    child: dock,
                  ),
          ),
        );
      },
    );
  }
}
