/// One card in a speech script: the Dart twin of `SpeechBlock` in `@feeef.dev/ui/speech/block`.
library;

import 'dart:async';

import 'package:flutter/gestures.dart';
import 'package:flutter/widgets.dart';

import '../brand/geometry.dart';
import '../brand/pixel_noise.dart';
import '../brand/pixel_texture.dart';
import '../i18n/i18n.dart';
import '../icons/lucide.dart';
import '../primitives/button.dart';
import '../theme.dart';
import '../theme/color_mix.dart';
import '../theme/css_text.dart';
import '../theme/light_edge.dart';
import '../theme/tokens.dart';
import 'reorder.dart';

/// One card in a speech script: a drag handle, a toolbar and the block's editor. Only the handle
/// drags; text editing, selection and scrolling stay native. Put blocks in a [SpeechReorderGroup]
/// (the siblings the web kit measures) and key each one by its id; outside a group the arrow keys
/// still move it. Editors call [SpeechBlock.noteInput] on every edit to light the card up while
/// the user types (the web kit listens for `input` events).
class SpeechBlock extends StatefulWidget {
  const SpeechBlock({
    super.key,
    required this.child,
    this.toolbar,
    required this.index,
    required this.count,
    required this.seed,
    this.reorderDisabled = false,
    required this.onMove,
  });

  /// The block's editor, usually a multiline text field.
  final Widget child;

  /// Controls next to the drag handle (speaker, style, delete). Defaults to a "Speech block N"
  /// caption. It gets the rest of the toolbar row.
  final Widget? toolbar;

  /// Position of this block in the list, from 0.
  final int index;

  /// Number of blocks in the list. Reordering is off below 2.
  final int count;

  /// Stable id that picks the corner texture, usually the block id.
  final String seed;

  /// Disables the drag handle, for example while a generation runs.
  final bool reorderDisabled;

  /// Called once on drop (or arrow key) with the old and new index.
  final void Function(int from, int to) onMove;

  /// Tells the enclosing block that its editor changed, so it shows the typing state for 420ms.
  static void noteInput(BuildContext context) =>
      context.getInheritedWidgetOfExactType<_BlockScope>()?.state._noteInput();

  @override
  State<SpeechBlock> createState() => _SpeechBlockState();
}

class _SpeechBlockState extends State<SpeechBlock> {
  final _reorder = SpeechReorder();
  late final _handleFocus = FocusNode(
    debugLabel: 'speech handle',
    onKeyEvent: (_, event) => _reorder.keyDown(event),
  );
  bool _typing = false;
  bool _focusWithin = false;
  Timer? _typingTimer;

  void _noteInput() {
    if (!_typing) setState(() => _typing = true);
    _typingTimer?.cancel();
    _typingTimer = Timer(const Duration(milliseconds: 420), () {
      if (mounted) setState(() => _typing = false);
    });
  }

  @override
  void didUpdateWidget(SpeechBlock old) {
    super.didUpdateWidget(old);
    if (old.index == widget.index) return;
    // Keep the focused editor in view after a move, but not mid-drag (that would jump the scroll).
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || SpeechReorder.reorderingOf(context)) return;
      final focused = FocusManager.instance.primaryFocus?.context;
      if (focused == null || !_focusWithin) return;
      for (final policy in [
        ScrollPositionAlignmentPolicy.keepVisibleAtEnd,
        ScrollPositionAlignmentPolicy.keepVisibleAtStart,
      ]) {
        Scrollable.ensureVisible(focused, alignmentPolicy: policy);
      }
    });
  }

  @override
  void dispose() {
    _typingTimer?.cancel();
    _reorder.dispose();
    _handleFocus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    _reorder.update(
      context,
      index: widget.index,
      count: widget.count,
      onMove: widget.onMove,
    );
    SpeechReorder.reorderingOf(context);
    final i18n = I18n.of(context);
    final label = i18n.t('lab.speech.block', {'index': widget.index + 1});
    final enabled = widget.count >= 2 && !widget.reorderDisabled;
    return _BlockScope(
      state: this,
      child: KeyedSubtree(
        key: _reorder.layoutKey,
        child: ValueListenableBuilder<double>(
          valueListenable: _reorder.offset,
          builder: (context, dy, child) =>
              Transform.translate(offset: Offset(0, dy), child: child),
          child: Semantics(
            container: true,
            explicitChildNodes: true,
            label: label,
            child: Focus(
              canRequestFocus: false,
              skipTraversal: true,
              onFocusChange: (focused) =>
                  setState(() => _focusWithin = focused),
              child: ListenableBuilder(
                listenable: Listenable.merge([
                  _reorder.dragging,
                  _reorder.settling,
                ]),
                builder: (context, _) => _BlockSurface(
                  seed: widget.seed,
                  typing: _typing,
                  focusWithin: _focusWithin,
                  dragging: _reorder.dragging.value,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        spacing: 2,
                        children: [
                          _Handle(
                            reorder: _reorder,
                            focusNode: _handleFocus,
                            enabled: enabled,
                            label: i18n.t('lab.speech.reorder', {
                              'index': widget.index + 1,
                            }),
                            hint: i18n.t('lab.speech.hint'),
                          ),
                          Expanded(
                            child: widget.toolbar ?? _Caption(text: label),
                          ),
                        ],
                      ),
                      widget.child,
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _BlockScope extends InheritedWidget {
  const _BlockScope({required this.state, required super.child});
  final _SpeechBlockState state;
  @override
  bool updateShouldNotify(_BlockScope old) => false;
}

/// `.lab-speech-block-caption`: 500 12px/20px, muted.
class _Caption extends StatelessWidget {
  const _Caption({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) {
    final c = ThemeProvider.of(context).colors;
    return DefaultTextStyle.merge(
      style: TextStyle(
        color: c.muted,
        fontSize: 12,
        fontWeight: FontWeight.w500,
        height: 20 / 12,
        leadingDistribution: TextLeadingDistribution.even,
      ),
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
      child: CssBaseline(lineHeight: 20, child: Text(text)),
    );
  }
}

/// `.lab-speech-drag`: a ghost toolbar icon button with a grab cursor that starts the drag on
/// press (`touch-action: none`), and moves the block with the arrow keys.
class _Handle extends StatelessWidget {
  const _Handle({
    required this.reorder,
    required this.focusNode,
    required this.enabled,
    required this.label,
    required this.hint,
  });
  final SpeechReorder reorder;
  final FocusNode focusNode;
  final bool enabled;
  final String label, hint;

  @override
  Widget build(BuildContext context) {
    Widget button = Semantics(
      hint: hint,
      child: Button(
        variant: ButtonVariant.ghost,
        appearance: ButtonAppearance.toolbar,
        controlSize: ControlSize.icon,
        ariaLabel: label,
        disabled: !enabled,
        focusNode: focusNode,
        onClick: () {},
        children: const [LucideGripVertical(size: 20)],
      ),
    );
    if (!enabled) return button;
    button = Listener(
      onPointerDown: (event) {
        focusNode.requestFocus();
        reorder.pointerDown(event);
      },
      onPointerMove: reorder.pointerMove,
      onPointerUp: reorder.pointerUp,
      onPointerCancel: reorder.pointerCancel,
      // Claims the pointer at once so the enclosing scroll view never takes it.
      child: RawGestureDetector(
        gestures: {
          EagerGestureRecognizer:
              GestureRecognizerFactoryWithHandlers<EagerGestureRecognizer>(
                EagerGestureRecognizer.new,
                (_) {},
              ),
        },
        child: button,
      ),
    );
    return Stack(
      children: [
        button,
        Positioned.fill(
          child: ValueListenableBuilder<bool>(
            valueListenable: reorder.dragging,
            builder: (context, dragging, _) => MouseRegion(
              opaque: false,
              hitTestBehavior: HitTestBehavior.translucent,
              cursor: dragging
                  ? SystemMouseCursors.grabbing
                  : SystemMouseCursors.grab,
            ),
          ),
        ),
      ],
    );
  }
}

/// `.lab-voice-paragraph`: the card's fill, border, corner texture, light edge and lifted shadow,
/// with the 180ms background and texture transitions.
class _BlockSurface extends StatelessWidget {
  const _BlockSurface({
    required this.seed,
    required this.typing,
    required this.focusWithin,
    required this.dragging,
    required this.child,
  });
  final String seed;
  final bool typing, focusWithin, dragging;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final reduced = reducedMotionOf(context);
    final duration = reduced
        ? Duration.zero
        : const Duration(milliseconds: 180);
    // Typing wins over focus-within (declared later in speech.css).
    final texture = typing
        ? 1.0
        : focusWithin
        ? 0.6
        : 0.42;
    return TweenAnimationBuilder<double>(
      tween: Tween(end: typing || dragging ? 0.11 : 0.07),
      duration: duration,
      curve: MotionTokens.ease,
      builder: (context, tint, child) => TweenAnimationBuilder<double>(
        tween: Tween(end: texture),
        duration: duration,
        curve: MotionTokens.ease,
        builder: (context, opacity, child) => TweenAnimationBuilder<double>(
          tween: Tween(end: typing ? -1 : 0),
          duration: duration,
          curve: MotionTokens.ease,
          builder: (context, shift, child) => CustomPaint(
            painter: _BlockPainter(
              radius: theme.sizes.radiusPanel,
              fill: mixSrgb(c.primary, tint, c.surface),
              border: dragging ? c.focus : c.line,
              ink: c.ink,
              seed: seed,
              textureOpacity: opacity,
              textureShift: shift,
              lifted: dragging,
              rim: glassStyleOf(context) != GlassStyle.solid,
              edgeLight: c.glassEdgeLight,
              edgeLow: c.glassEdgeLow,
            ),
            child: child,
          ),
          child: child,
        ),
        child: child,
      ),
      // CSS boxes are border-box with a 1px border: padding 6px 10px 8px plus the border.
      child: Padding(
        padding: const EdgeInsets.fromLTRB(11, 7, 11, 9),
        child: child,
      ),
    );
  }
}

class _BlockPainter extends CustomPainter {
  _BlockPainter({
    required this.radius,
    required this.fill,
    required this.border,
    required this.ink,
    required this.seed,
    required this.textureOpacity,
    required this.textureShift,
    required this.lifted,
    required this.rim,
    required this.edgeLight,
    required this.edgeLow,
  });
  final double radius, textureOpacity, textureShift;
  final Color fill, border, ink, edgeLight, edgeLow;
  final String seed;
  final bool lifted, rim;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final radii = [radius, radius, radius, radius];
    final shape = superellipsePath(rect, radii);
    if (lifted) {
      // 0 12px 28px rgb(0 0 0 / 12%), 0 2px 6px rgb(0 0 0 / 8%).
      canvas.drawPath(
        shape.shift(const Offset(0, 12)),
        Paint()
          ..color = const Color.from(alpha: 0.12, red: 0, green: 0, blue: 0)
          ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 14),
      );
      canvas.drawPath(
        shape.shift(const Offset(0, 2)),
        Paint()
          ..color = const Color.from(alpha: 0.08, red: 0, green: 0, blue: 0)
          ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 3),
      );
    }
    canvas.drawPath(shape, Paint()..color = fill);
    // `.lab-speech-block-texture`: the padding box, clipped to the corners, at 0.13 × its opacity.
    canvas.save();
    canvas.clipPath(superellipsePath(rect, radii, inset: 1));
    paintPixelTexture(
      canvas,
      rect.deflate(1).shift(Offset(0, textureShift)),
      color: ink,
      opacity: 0.13 * textureOpacity,
      variant: TextureVariant.corner,
      density: TextureDensity.sparse,
      seed: seed,
    );
    canvas.restore();
    canvas.drawPath(
      superellipsePath(rect, radii, inset: 0.5),
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1
        ..color = border,
    );
    if (rim) {
      paintLightEdge(canvas, size, radius, light: edgeLight, low: edgeLow);
    }
  }

  @override
  bool shouldRepaint(_BlockPainter old) =>
      old.radius != radius ||
      old.fill != fill ||
      old.border != border ||
      old.ink != ink ||
      old.seed != seed ||
      old.textureOpacity != textureOpacity ||
      old.textureShift != textureShift ||
      old.lifted != lifted ||
      old.rim != rim ||
      old.edgeLight != edgeLight ||
      old.edgeLow != edgeLow;
}
