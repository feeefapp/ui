import 'dart:math' as math;

import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import '../brand/geometry.dart';
import '../glass/container.dart';
import '../glass/member.dart';
import '../primitives/raw_input.dart';
import '../theme.dart';
import '../theme/tokens.dart' show MotionTokens;
import '../theme/color_mix.dart';
import '../theme/css_text.dart';
import '../theme/light_edge.dart';
import '../theme/surfaces.dart';
import 'composer_layout.dart';

export 'composer_layout.dart';

/// `--lab-space-1` / `--lab-space-2` / `--lab-space-3` for a density.
double _space(SizeTokens s, int step) => switch ((step, s.density)) {
  (1, Density.thin) => 2,
  (1, _) => 4,
  (2, Density.thin) => 6,
  (2, _) => 8,
  (3, Density.comfortable) => 12,
  (3, Density.compact) => 10,
  (3, _) => 8,
  _ => 8,
};

/// Shared Chat/Image card (`.lab-pc-card`): the twin of `ComposerCard` in
/// `@feeef.dev/ui/composer/composer`. Its glass is painted by a glass container (its own, or the
/// row it sits in), so it shares light, press and tint; it follows its own animated height.
/// Focus anywhere inside rings it in the primary colour.
class ComposerCard extends StatefulWidget {
  const ComposerCard({
    super.key,
    this.expanded = false,
    this.above,
    this.focused,
    this.dropActive = false,
    this.shellInset,
    required this.child,
  });

  /// Two-row layout (field above, tools below). Paint only: the [ComposerLayout] decides it.
  final bool expanded;

  /// Content inside the card, above the layout grid.
  final Widget? above;

  /// Forces the focus ring (`data-focused`); null rings the card while focus is inside it.
  final bool? focused;

  /// Dashed primary outline while a compatible file is dragged over the drop target.
  final bool dropActive;

  /// `--pc-shell-inset`: block padding and inline-end padding. Null: half of `--lab-space-3`.
  final double? shellInset;

  /// The layout grid, usually a [ComposerLayout].
  final Widget child;

  @override
  State<ComposerCard> createState() => _ComposerCardState();
}

class _ComposerCardState extends State<ComposerCard> {
  bool _within = false;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final s = theme.sizes;
    final radius = 26 * s.radiusScale;
    final inset = widget.shellInset ?? _space(s, 3) / 2;
    final focused = widget.focused ?? _within;
    final content = Padding(
      // The 1px border, then `padding-block: inset; padding-inline: space-2 inset`.
      padding: EdgeInsetsDirectional.fromSTEB(
        1 + _space(s, 2),
        1 + inset,
        1 + inset,
        1 + inset,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [?widget.above, widget.child],
      ),
    );
    final card = CustomPaint(
      foregroundPainter: _CardStatePainter(
        radius: radius,
        border: focused ? mixSrgb(c.primary, 0.55, c.line) : null,
        ring: focused ? mixSrgb(c.primary, 0.14, transparent) : null,
        dashed: widget.dropActive ? c.primary : null,
      ),
      child: GlassMemberBox(
        motion: GlassMotion.follow,
        radius: radius,
        standalone: (child) => CustomPaint(
          painter: _CardPainter(
            radius: radius,
            fill: mixSrgb(c.surface, 0.88, transparent),
            line: c.line,
            edgeLight: c.glassEdgeLight,
            edgeLow: c.glassEdgeLow,
            shadow: glassShadowColor(theme.brightness),
          ),
          child: child,
        ),
        child: content,
      ),
    );
    return Focus(
      canRequestFocus: false,
      skipTraversal: true,
      onFocusChange: (value) => setState(() => _within = value),
      child: GlassScope(child: card),
    );
  }
}

/// `.lab-pc-card` painted on its own (outside a glass container).
class _CardPainter extends CustomPainter {
  _CardPainter({
    required this.radius,
    required this.fill,
    required this.line,
    required this.edgeLight,
    required this.edgeLow,
    required this.shadow,
  });
  final double radius;
  final Color fill, line, edgeLight, edgeLow, shadow;

  @override
  void paint(Canvas canvas, Size size) {
    paintFloatingSurface(
      canvas,
      size,
      radius,
      fill: fill,
      line: line,
      edgeLow: edgeLow,
      shadow: shadow,
    );
    paintLightEdge(canvas, size, radius, light: edgeLight, low: edgeLow);
  }

  @override
  bool shouldRepaint(_CardPainter old) =>
      old.radius != radius ||
      old.fill != fill ||
      old.line != line ||
      old.shadow != shadow;
}

/// Focus border and 4px ring, and the dashed drop outline (2px, 3px outside).
class _CardStatePainter extends CustomPainter {
  _CardStatePainter({
    required this.radius,
    required this.border,
    required this.ring,
    required this.dashed,
  });
  final double radius;
  final Color? border, ring, dashed;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    List<double> r(double v) => [v, v, v, v];
    if (ring != null) {
      // box-shadow: 0 0 0 4px: a band just outside the border box.
      canvas.drawPath(
        Path.combine(
          PathOperation.difference,
          superellipsePath(rect.inflate(4), r(radius + 4)),
          superellipsePath(rect, r(radius)),
        ),
        Paint()..color = ring!,
      );
    }
    if (border != null) {
      canvas.drawPath(
        superellipsePath(rect, r(radius), inset: 0.5),
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1
          ..color = border!,
      );
    }
    if (dashed != null) {
      final outline = superellipsePath(
        rect.inflate(4),
        r(radius + 4),
        inset: 1,
      );
      final dashedPath = Path();
      for (final metric in outline.computeMetrics()) {
        for (var d = 0.0; d < metric.length; d += 12) {
          dashedPath.addPath(
            metric.extractPath(d, math.min(d + 6, metric.length)),
            Offset.zero,
          );
        }
      }
      canvas.drawPath(
        dashedPath,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2
          ..color = dashed!,
      );
    }
  }

  @override
  bool shouldRepaint(_CardStatePainter old) =>
      old.radius != radius ||
      old.border != border ||
      old.ring != ring ||
      old.dashed != dashed;
}

/// Placeholder that fades in word by word (28ms apart, 420ms each): the twin of `ComposerHint`.
/// Decorative (excluded from semantics); label the field separately. Changing [text] replays it;
/// reduced motion shows it at once.
class ComposerHint extends StatefulWidget {
  const ComposerHint({super.key, required this.text});

  /// The hint text.
  final String text;

  @override
  State<ComposerHint> createState() => _ComposerHintState();
}

class _ComposerHintState extends State<ComposerHint>
    with SingleTickerProviderStateMixin {
  late final _clock = AnimationController(vsync: this);
  late List<String> _parts;

  @override
  void initState() {
    super.initState();
    _split();
  }

  void _split() {
    // `text.split(/(\s+)/)`: words and the whitespace runs between them.
    _parts = [];
    final pattern = RegExp(r'\s+');
    var index = 0;
    for (final match in pattern.allMatches(widget.text)) {
      _parts.add(widget.text.substring(index, match.start));
      _parts.add(match.group(0)!);
      index = match.end;
    }
    _parts.add(widget.text.substring(index));
  }

  void _play() {
    final reduced = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
    final last = math.min(_parts.length - 1, 40);
    _clock.duration = Duration(milliseconds: 420 + 28 * math.max(0, last));
    if (reduced) {
      _clock.value = 1;
    } else {
      _clock.forward(from: 0);
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _play();
  }

  @override
  void didUpdateWidget(ComposerHint old) {
    super.didUpdateWidget(old);
    if (old.text != widget.text) {
      _split();
      _play();
    }
  }

  @override
  void dispose() {
    _clock.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final style = DefaultTextStyle.of(context).style;
    final color = style.color ?? const Color(0xFF000000);
    return ExcludeSemantics(
      child: AnimatedBuilder(
        animation: _clock,
        builder: (context, _) {
          final ms = _clock.value * (_clock.duration?.inMilliseconds ?? 0);
          double shown(int i) => MotionTokens.easeOut.transform(
            ((ms - math.min(i, 40) * 28) / 420).clamp(0, 1),
          );
          // Words are inline blocks, like the web kit's spans, each rising 3px as it fades in.
          // The hint takes its own text's direction (web `dir="auto"`), so an English hint on an
          // Arabic page keeps its word order, and aligns to the page's start (`match-parent`).
          final rtl = Directionality.of(context) == TextDirection.rtl;
          return Text.rich(
            TextSpan(
              children: [
                for (var i = 0; i < _parts.length; i++)
                  if (_parts[i].isEmpty)
                    const TextSpan()
                  else if (i.isOdd)
                    TextSpan(text: _parts[i])
                  else
                    WidgetSpan(
                      alignment: PlaceholderAlignment.baseline,
                      baseline: TextBaseline.alphabetic,
                      child: Opacity(
                        opacity: shown(i),
                        child: Transform.translate(
                          offset: Offset(0, 3 * (1 - shown(i))),
                          child: Text(
                            _parts[i],
                            style: TextStyle(color: color),
                          ),
                        ),
                      ),
                    ),
              ],
            ),
            textDirection: autoTextDirection(_parts.join(), Directionality.of(context)),
            textAlign: rtl ? TextAlign.right : TextAlign.left,
            maxLines: 1,
            softWrap: false,
            overflow: TextOverflow.ellipsis,
          );
        },
      ),
    );
  }
}

/// The composer's text area (`.lab-pc-field` with its textarea): a [RawInput] in 16/24 text,
/// at least `--lab-control-compact` tall and at most 168px (then it scrolls), with the animated
/// [ComposerHint] while it is empty. Shared by [PromptComposer] and the image composer.
class ComposerInput extends StatelessWidget {
  const ComposerInput({
    super.key,
    required this.value,
    required this.onValueChange,
    required this.label,
    this.placeholder,
    this.disabled = false,
    this.readOnly = false,
    this.maxLength,
    this.focusNode,
    this.onKeyEvent,
    this.onFocusChange,
  });

  final String value;
  final ValueChanged<String> onValueChange;

  /// Accessible name of the text field.
  final String label;

  /// Animated hint while the field is empty.
  final String? placeholder;
  final bool disabled, readOnly;
  final int? maxLength;
  final FocusNode? focusNode;
  final KeyEventResult Function(KeyEvent event, TextEditingValue value)?
  onKeyEvent;
  final ValueChanged<bool>? onFocusChange;

  /// The field's metrics for a theme: minimum height, block padding, inline padding.
  static ({double minHeight, double padBlock, double padInline}) metrics(
    SizeTokens s,
  ) => (
    minHeight: s.controlCompact,
    padBlock: (s.controlCompact - 24) / 2,
    padInline: _space(s, 2),
  );

  /// `font: 400 16px/24px var(--lab-font)`.
  static const textStyle = TextStyle(
    fontSize: 16,
    height: 1.5,
    fontWeight: FontWeight.w400,
    leadingDistribution: TextLeadingDistribution.even,
  );

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final m = metrics(theme.sizes);
    return ConstrainedBox(
      constraints: BoxConstraints(minHeight: m.minHeight, maxHeight: 168),
      child: Stack(
        children: [
          Padding(
            padding: EdgeInsets.symmetric(
              horizontal: m.padInline,
              vertical: math.max(0, m.padBlock),
            ),
            child: DefaultTextStyle.merge(
              style: textStyle.copyWith(color: c.ink),
              child: RawInput(
                value: value,
                onValueChange: onValueChange,
                label: label,
                multiline: true,
                autoResize: false,
                autoDirection: true,
                disabled: disabled,
                readOnly: readOnly,
                maxLength: maxLength,
                focusNode: focusNode,
                onKeyEvent: onKeyEvent,
                onFocusChange: onFocusChange,
              ),
            ),
          ),
          if (value.isEmpty && placeholder != null && placeholder!.isNotEmpty)
            // `.lab-pc-hint { inset: 8px 8px auto; font-size: 16px; line-height: 24px }`.
            PositionedDirectional(
              start: 8,
              end: 8,
              top: 8,
              child: IgnorePointer(
                child: DefaultTextStyle.merge(
                  style: textStyle.copyWith(color: c.muted),
                  child: CssBaseline(
                    lineHeight: 24,
                    child: ComposerHint(text: placeholder!),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Enter (not Shift+Enter, not while an IME composes) runs [submit]; the event is handled either
/// way so the line doesn't break.
KeyEventResult composerEnterKey(
  KeyEvent event,
  TextEditingValue value,
  VoidCallback submit,
) {
  if (event.logicalKey != LogicalKeyboardKey.enter &&
      event.logicalKey != LogicalKeyboardKey.numpadEnter) {
    return KeyEventResult.ignored;
  }
  if (HardwareKeyboard.instance.isShiftPressed || value.composing.isValid) {
    return KeyEventResult.ignored;
  }
  if (event is KeyDownEvent) submit();
  return KeyEventResult.handled;
}

/// Canonical measured Lab composer with a stable caret, a growing input and responsive tool
/// slots: the twin of `PromptComposer` in `@feeef.dev/ui/composer/composer`. One line until the
/// text needs room, then the field takes the top row and the tools move below. Enter sends;
/// Shift+Enter adds a line.
class PromptComposer extends StatefulWidget {
  const PromptComposer({
    super.key,
    required this.value,
    required this.onValueChange,
    required this.onSubmit,
    required this.label,
    this.placeholder,
    this.disabled = false,
    this.busy = false,
    this.dropActive = false,
    this.submitDisabled = false,
    this.maxLength,
    this.above,
    this.tools = const [],
    required this.submit,
    this.footer,
    this.focusNode,
  });

  /// The prompt text (controlled).
  final String value;

  /// Called with the new text on every edit.
  final ValueChanged<String> onValueChange;

  /// Called on Enter, only when the prompt is not blank and submitting is allowed. Wire the
  /// [submit] button's `onClick` to the same action.
  final VoidCallback onSubmit;

  /// Accessible name of the text field.
  final String label;

  /// Animated hint shown while the field is empty.
  final String? placeholder;

  /// Disables the field and blocks submitting.
  final bool disabled;

  /// Request in flight: the field turns read-only, the composer is marked busy and submitting is
  /// blocked.
  final bool busy;

  /// Highlight the card only while a compatible file is dragged over the drop target.
  final bool dropActive;

  /// Blocks submitting without disabling the field.
  final bool submitDisabled;

  /// Maximum prompt length in characters.
  final int? maxLength;

  /// Files, references, mask controls or a contextual note above the input card.
  final Widget? above;

  /// Attach, record, model and task controls. Their behaviour stays with the host.
  final List<Widget> tools;

  /// Host-supplied shared submit/stop/compare controls, with their own permissions.
  final Widget submit;

  /// Content below the card, such as a caption or allowance note.
  final Widget? footer;

  /// Focus of the text field.
  final FocusNode? focusNode;

  @override
  State<PromptComposer> createState() => _PromptComposerState();
}

class _PromptComposerState extends State<PromptComposer> {
  bool _expanded = false;

  bool get _canSubmit =>
      !widget.disabled &&
      !widget.busy &&
      !widget.submitDisabled &&
      widget.value.trim().isNotEmpty;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final s = theme.sizes;
    final m = ComposerInput.metrics(s);
    final gap = _space(s, 2);
    final card = ComposerCard(
      expanded: _expanded,
      dropActive: widget.dropActive,
      child: ComposerLayout(
        prompt: widget.value,
        textStyle: ComposerInput.textStyle.copyWith(
          fontFamily: DefaultTextStyle.of(context).style.fontFamily,
          fontFamilyFallback: DefaultTextStyle.of(context)
              .style
              .fontFamilyFallback,
        ),
        fieldPadding: m.padInline * 2,
        fieldMinHeight: m.minHeight,
        gap: _space(s, 1),
        onExpandedChange: (value) {
          if (mounted && value != _expanded) setState(() => _expanded = value);
        },
        children: [
          ComposerSlot(
            compact: ComposerSlotSide.start,
            expanded: ComposerSlotSide.start,
            fill: true,
            child: Wrap(
              spacing: gap,
              runSpacing: gap,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: widget.tools,
            ),
          ),
          ComposerInput(
            value: widget.value,
            onValueChange: widget.onValueChange,
            label: widget.label,
            placeholder: widget.placeholder,
            disabled: widget.disabled,
            readOnly: widget.busy,
            maxLength: widget.maxLength,
            focusNode: widget.focusNode,
            onKeyEvent: (event, value) => composerEnterKey(event, value, () {
              if (_canSubmit) widget.onSubmit();
            }),
          ),
          ComposerSlot(child: Center(widthFactor: 1, child: widget.submit)),
        ],
      ),
    );
    return Semantics(
      container: true,
      // aria-busy has no Flutter twin; a busy composer is announced through its read-only field.
      child: Center(
        heightFactor: 1,
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 780),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: gap,
            children: [?widget.above, card, ?widget.footer],
          ),
        ),
      ),
    );
  }
}
