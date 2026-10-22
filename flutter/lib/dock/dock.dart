import 'dart:math' as math;

import 'package:flutter/widgets.dart';

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
class Dock extends StatelessWidget {
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
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final narrow = (MediaQuery.maybeSizeOf(context)?.width ?? 1000) <= 420;
    final reduced = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
    return LayoutBuilder(
      builder: (context, constraints) {
        // 4px padding inside the 1px border on each side.
        final available = math.max(0.0, constraints.maxWidth - 10);
        final gap = narrow ? 4.0 : 8.0;
        // The tile takes at most 40% of the room and always leaves an action's width.
        final tileMax = math.max(
          0.0,
          math.min(available * 0.4, available - 44 - gap),
        );
        Widget row = Row(
          mainAxisSize: MainAxisSize.min,
          spacing: gap,
          children: [
            if (content != null)
              Flexible(
                child: ConstrainedBox(
                  constraints: BoxConstraints(maxWidth: tileMax),
                  child: Padding(
                    padding: EdgeInsets.symmetric(horizontal: narrow ? 6 : 10),
                    child: DefaultTextStyle.merge(
                      style: const TextStyle(fontSize: 13),
                      maxLines: 1,
                      softWrap: false,
                      overflow: TextOverflow.ellipsis,
                      child: content!,
                    ),
                  ),
                ),
              ),
            Flexible(
              child: Row(
                mainAxisSize: MainAxisSize.min,
                spacing: 4,
                children: children,
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
