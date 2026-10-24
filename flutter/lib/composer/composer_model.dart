import 'dart:math' as math;

/// Pure rules of the composer family: the twin of `@feeef.dev/ui/composer/composer-model`.

/// The places inside the capsule, top to bottom: attachments, the field, then tools · actions ·
/// send.
enum ComposerSlotName { attachments, field, tools, actions, send }

/// Where a slot is drawn, in the capsule's own pixels: its offset, height and opacity.
typedef ComposerSlotBox = ({double x, double y, double height, double opacity});

/// The capsule at one moment: its height and every slot that is on screen.
typedef ComposerLayoutSnapshot = ({
  double height,
  Map<ComposerSlotName, ComposerSlotBox> slots,
});

/// Whether the capsule shows its second row (tools beside the actions and send). Calm while empty
/// and idle; open while it has text, while focus is inside, or while one of its menus or panels is
/// open ([pinned]), so a control never disappears under the pointer.
bool composerExpanded({
  required bool hasText,
  required bool focusWithin,
  required bool pinned,
}) => hasText || focusWithin || pinned;

/// What the send button shows: a quiet neutral circle, the primary arrow, a loader, or a loader
/// that stops.
enum ComposerSendState { idle, ready, sending, stop }

ComposerSendState composerSendState({
  required bool ready,
  required bool submitting,
  required bool stoppable,
}) {
  if (submitting) {
    return stoppable ? ComposerSendState.stop : ComposerSendState.sending;
  }
  return ready ? ComposerSendState.ready : ComposerSendState.idle;
}

double _mix(double from, double to, double p) => from + (to - from) * p;

/// One slot of a frame: how far to draw it from its laid-out place, how tall and how opaque.
typedef ComposerSlotFrame = ({
  double dx,
  double dy,
  double height,
  double opacity,
});

/// One frame of a layout change, driven by one spring progress [p] (0 → 1, may overshoot): the
/// capsule's height and, per slot in [to], how far to draw it from its laid-out place. Mixing in
/// the capsule's own coordinates keeps anchoring right: a capsule pinned at its top grows down and
/// its send button moves down; one pinned at its bottom grows up and its send button stays still.
/// A slot new in [to] fades in where it lands.
({double height, Map<ComposerSlotName, ComposerSlotFrame> slots}) composerFrame(
  ComposerLayoutSnapshot from,
  ComposerLayoutSnapshot to,
  double p,
) {
  final slots = <ComposerSlotName, ComposerSlotFrame>{};
  for (final MapEntry(key: name, value: end) in to.slots.entries) {
    final start =
        from.slots[name] ??
        (x: end.x, y: end.y, height: end.height, opacity: 0.0);
    slots[name] = (
      dx: _mix(start.x, end.x, p) - end.x,
      dy: _mix(start.y, end.y, p) - end.y,
      height: math.max(0, _mix(start.height, end.height, p)),
      opacity: _mix(start.opacity, end.opacity, p).clamp(0.0, 1.0),
    );
  }
  return (height: math.max(0, _mix(from.height, to.height, p)), slots: slots);
}

/// True when two snapshots draw the same (nothing worth animating).
bool composerSameLayout(ComposerLayoutSnapshot a, ComposerLayoutSnapshot b) {
  if ((a.height - b.height).abs() > 0.5) return false;
  for (final name in {...a.slots.keys, ...b.slots.keys}) {
    final x = a.slots[name];
    final y = b.slots[name];
    if (x == null || y == null) return false;
    if ((x.x - y.x).abs() > 0.5 ||
        (x.y - y.y).abs() > 0.5 ||
        (x.height - y.height).abs() > 0.5) {
      return false;
    }
    if ((x.opacity - y.opacity).abs() > 0.01) return false;
  }
  return true;
}

/// The current frame as a snapshot, so an interrupted change continues from what is on screen.
ComposerLayoutSnapshot composerFrameSnapshot(
  ComposerLayoutSnapshot from,
  ComposerLayoutSnapshot to,
  double p,
) {
  final frame = composerFrame(from, to, p);
  return (
    height: frame.height,
    slots: {
      for (final MapEntry(key: name, value: f) in frame.slots.entries)
        name: (
          x: to.slots[name]!.x + f.dx,
          y: to.slots[name]!.y + f.dy,
          height: f.height,
          opacity: f.opacity,
        ),
    },
  );
}
