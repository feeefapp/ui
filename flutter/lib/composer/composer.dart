import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import '../brand/geometry.dart';
import '../brand/pixel_loader.dart';
import '../glass/container.dart';
import '../i18n/i18n.dart';
import '../icons/lucide.dart';
import '../physics/layout_group.dart';
import '../primitives/button.dart';
import '../primitives/raw_input.dart';
import '../scaffold.dart' show GlassGroup;
import '../scroll/metrics.dart';
import '../theme.dart';
import '../theme/color_mix.dart';
import '../theme/css_text.dart';
import '../theme/tokens.dart' show MotionTokens;
import 'composer_layout.dart';
import 'composer_model.dart';

export 'composer_layout.dart';
export 'composer_model.dart';

/// `--lab-space-1` / `--lab-space-3` for a density.
double _space1(SizeTokens s) => s.density == Density.thin ? 2 : 4;
double _space6(SizeTokens s) => switch (s.density) {
  Density.comfortable => 24,
  Density.compact => 16,
  Density.thin => 12,
};
double _space3(SizeTokens s) => switch (s.density) {
  Density.comfortable => 12,
  Density.compact => 10,
  Density.thin => 8,
};

/// Badges over a photo stay a dark veil with white marks in every theme, as on iOS
/// (`--lab-composer-scrim`, `--lab-composer-on-scrim`).
const _scrim = Color(0x8F000000);
const _onScrim = Color(0xFFFFFFFF);

/// The composer's metrics for a theme (the web kit's `--lab-composer-*`): the one-line capsule and
/// leading bubble [item] (a toolbar bubble, at least the touch target on touch screens), the small
/// [control]s inside it (chips, actions, send) and their [inset] from its edge, its [radius], the
/// field's text [line] and [textStart] (where a chip's icon starts), the attachment [thumb], and
/// how far a tile's × badge ([remove]) reaches past its corner ([overhang]).
class ComposerMetrics {
  const ComposerMetrics._(this.sizes, this.item);

  factory ComposerMetrics.of(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final s = theme.sizes;
    final item = theme.coarsePointer(context)
        ? math.max(s.toolbarItem, s.touchTarget)
        : s.toolbarItem;
    return ComposerMetrics._(s, item);
  }

  final SizeTokens sizes;
  final double item;
  double get control => sizes.controlSmall;
  double get inset => (item - control) / 2;
  double get radius => item / 2 * sizes.radiusScale;
  double get line => SizeTokens.controlLine(sizes.controlFont);
  double get textStart => sizes.controlPaddingSmall + 1;
  double get thumb => item + _space3(sizes);
  double get overhang => sizes.shellGap - 1;
  double get remove => item / 2;

  /// `font: 400 var(--lab-control-font) / var(--lab-composer-line)`.
  TextStyle get textStyle => TextStyle(
    fontSize: sizes.controlFont,
    height: line / sizes.controlFont,
    fontWeight: FontWeight.w400,
    leadingDistribution: TextLeadingDistribution.even,
  );
}

/// What a [ComposerBar] tells its parts: whether the second row is open.
class _ComposerScope extends InheritedWidget {
  const _ComposerScope({required this.expanded, required super.child});
  final bool expanded;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties.add(
      FlagProperty('expanded', value: expanded, ifTrue: 'expanded'),
    );
  }

  @override
  bool updateShouldNotify(_ComposerScope old) => old.expanded != expanded;
}

/// The composer's text field (`ComposerField` in the web kit): an unpainted multiline input in
/// the control font that grows from one line to [maxLines], then scrolls, with the animated
/// [ComposerHint] while empty. Enter calls [onSubmit]; Shift+Enter breaks the line. Place it in
/// [ComposerBar]'s `field` slot.
class ComposerField extends StatelessWidget {
  const ComposerField({
    super.key,
    required this.value,
    required this.onValueChange,
    required this.label,
    this.placeholder,
    this.onSubmit,
    this.maxLines = 6,
    this.maxLength,
    this.disabled = false,
    this.readOnly = false,
    this.focusNode,
    this.controller,
    this.onKeyEvent,
    this.onFocusChange,
  });

  /// The text (controlled).
  final String value;

  /// Called with the new text on every edit.
  final ValueChanged<String> onValueChange;

  /// Accessible name of the field.
  final String label;

  /// Animated hint shown while the field is empty.
  final String? placeholder;

  /// Called on Enter (not Shift+Enter, not while an input method composes). The owner decides
  /// whether it sends.
  final VoidCallback? onSubmit;

  /// Lines the field grows to before it scrolls.
  final int maxLines;
  final int? maxLength;
  final bool disabled, readOnly;
  final FocusNode? focusNode;

  /// Optional controller (caret-aware menus like `@` mentions read its selection).
  final TextEditingController? controller;

  /// Runs before the built-in Enter handling; return `handled` to skip it.
  final KeyEventResult Function(KeyEvent event)? onKeyEvent;
  final ValueChanged<bool>? onFocusChange;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(StringProperty('value', value))
      ..add(
        ObjectFlagProperty<ValueChanged<String>>.has(
          'onValueChange',
          onValueChange,
        ),
      )
      ..add(StringProperty('label', label))
      ..add(StringProperty('placeholder', placeholder, defaultValue: null))
      ..add(ObjectFlagProperty<VoidCallback>.has('onSubmit', onSubmit))
      ..add(IntProperty('maxLines', maxLines, defaultValue: 6))
      ..add(IntProperty('maxLength', maxLength, defaultValue: null))
      ..add(
        FlagProperty(
          'disabled',
          value: disabled,
          ifTrue: 'disabled',
          defaultValue: false,
        ),
      )
      ..add(
        FlagProperty(
          'readOnly',
          value: readOnly,
          ifTrue: 'read only',
          defaultValue: false,
        ),
      )
      ..add(
        DiagnosticsProperty<FocusNode>(
          'focusNode',
          focusNode,
          defaultValue: null,
        ),
      )
      ..add(
        ObjectFlagProperty<KeyEventResult Function(KeyEvent event)>.has(
          'onKeyEvent',
          onKeyEvent,
        ),
      )
      ..add(
        ObjectFlagProperty<ValueChanged<bool>>.has(
          'onFocusChange',
          onFocusChange,
        ),
      );
  }

  @override
  Widget build(BuildContext context) {
    final c = ThemeProvider.of(context).colors;
    final m = ComposerMetrics.of(context);
    final s = m.sizes;
    final expanded =
        context
            .dependOnInheritedWidgetOfExactType<_ComposerScope>()
            ?.expanded ??
        false;
    final padBlock = math.max(0.0, (m.control - m.line) / 2);
    final padStart = m.textStart;
    final padEnd = expanded ? m.textStart : _space1(s);
    return ConstrainedBox(
      constraints: BoxConstraints(minHeight: m.control),
      child: Stack(
        children: [
          Padding(
            padding: EdgeInsetsDirectional.fromSTEB(
              padStart,
              padBlock,
              padEnd,
              padBlock,
            ),
            child: DefaultTextStyle.merge(
              style: m.textStyle.copyWith(color: c.ink),
              child: RawInput(
                value: value,
                onValueChange: onValueChange,
                label: label,
                multiline: true,
                minLines: 1,
                maxLines: maxLines,
                autoDirection: true,
                disabled: disabled,
                readOnly: readOnly,
                maxLength: maxLength,
                focusNode: focusNode,
                controller: controller,
                onFocusChange: onFocusChange,
                onKeyEvent: (event, text) {
                  final own = onKeyEvent?.call(event);
                  if (own == KeyEventResult.handled) return own!;
                  return composerEnterKey(event, text, () => onSubmit?.call());
                },
              ),
            ),
          ),
          if (value.isEmpty && placeholder != null && placeholder!.isNotEmpty)
            PositionedDirectional(
              start: padStart,
              end: _space1(s),
              top: padBlock,
              child: IgnorePointer(
                // A hint longer than the field fades out at its end instead of being cut.
                child: ShaderMask(
                  blendMode: BlendMode.dstIn,
                  shaderCallback: (bounds) {
                    final fade = bounds.width > 0
                        ? (_space6(s) / bounds.width).clamp(0.0, 1.0)
                        : 0.0;
                    const opaque = Color(0xFF000000);
                    final rtl = Directionality.of(context) == TextDirection.rtl;
                    return LinearGradient(
                      begin: rtl ? Alignment.centerRight : Alignment.centerLeft,
                      end: rtl ? Alignment.centerLeft : Alignment.centerRight,
                      colors: const [opaque, opaque, Color(0x00000000)],
                      stops: [0, 1 - fade, 1],
                    ).createShader(bounds);
                  },
                  child: DefaultTextStyle.merge(
                    style: m.textStyle.copyWith(color: c.muted),
                    child: CssBaseline(
                      lineHeight: m.line,
                      child: ComposerHint(text: placeholder!),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// The send button inside the capsule, at its trailing end (`ComposerSend` in the web kit): a
/// quiet neutral circle while there is nothing to send, the primary circle with an up arrow when
/// there is, the kit's loader while sending. With [onStop] the sending button stays enabled and
/// stops the request.
class ComposerSend extends StatelessWidget {
  const ComposerSend({
    super.key,
    required this.label,
    required this.ready,
    this.submitting = false,
    this.onSend,
    this.onStop,
    this.stopLabel,
  });

  /// Accessible name, such as "Send message" or "Create image".
  final String label;

  /// There is something to send and sending is allowed.
  final bool ready;

  /// A request is in flight: shows the loader.
  final bool submitting;
  final VoidCallback? onSend;

  /// Makes the sending button a stop button.
  final VoidCallback? onStop;

  /// Accessible name while it stops. Defaults to the localized "Stop".
  final String? stopLabel;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(StringProperty('label', label))
      ..add(FlagProperty('ready', value: ready, ifTrue: 'ready'))
      ..add(
        FlagProperty(
          'submitting',
          value: submitting,
          ifTrue: 'submitting',
          defaultValue: false,
        ),
      )
      ..add(ObjectFlagProperty<VoidCallback>.has('onSend', onSend))
      ..add(ObjectFlagProperty<VoidCallback>.has('onStop', onStop))
      ..add(StringProperty('stopLabel', stopLabel, defaultValue: null));
  }

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final t = I18n.of(context).t;
    final state = composerSendState(
      ready: ready,
      submitting: submitting,
      stoppable: onStop != null,
    );
    final Widget button = switch (state) {
      ComposerSendState.stop => IconButton(
        variant: ButtonVariant.filled,
        controlSize: ControlSize.small,
        ariaLabel: stopLabel ?? t('lab.composer.stop'),
        onClick: onStop,
        icon: PixelLoader(size: 16, decorative: true, color: c.onPrimary),
      ),
      _ => IconButton(
        variant: state == ComposerSendState.idle
            ? ButtonVariant.ghost
            : ButtonVariant.filled,
        controlSize: ControlSize.small,
        ariaLabel: label,
        disabled: state == ComposerSendState.idle,
        loading: state == ComposerSendState.sending,
        onClick: onSend,
        icon: const LucideIcon(LucideIcons.arrowUp),
      ),
    };
    return DecoratedBox(
      decoration: ShapeDecoration(
        color: state == ComposerSendState.idle
            ? mixSrgb(c.ink, 0.08, transparent)
            : transparent,
        // The same capsule as the button it holds (a circle at the default radius scale).
        shape: SuperellipseBorder(
          radius:
              ComposerMetrics.of(context).control / 2 * theme.sizes.radiusScale,
        ),
      ),
      child: button,
    );
  }
}

/// Attachments inside the capsule, above the text, like iOS Messages (`ComposerAttachments` in
/// the web kit): one row of [ComposerAttachment] tiles that scrolls sideways with edge fades when
/// it overflows, and, with [max], a quiet count of how many fit, centred on the tiles. It reaches
/// the capsule's border; tiles sit the gap G from its edge, with room above and after them for the
/// × badges that reach past their corners.
class ComposerAttachments extends StatefulWidget {
  const ComposerAttachments({
    super.key,
    required this.label,
    this.count,
    this.max,
    required this.children,
  });

  /// Accessible name of the list, such as "Reference images".
  final String label;

  /// How many are attached; shown with [max].
  final int? count;

  /// How many fit. Shows "2 of 4" at the trailing end.
  final int? max;

  /// [ComposerAttachment] tiles.
  final List<ComposerAttachment> children;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(StringProperty('label', label))
      ..add(IntProperty('count', count, defaultValue: null))
      ..add(IntProperty('max', max, defaultValue: null));
  }

  @override
  State<ComposerAttachments> createState() => _ComposerAttachmentsState();
}

class _ComposerAttachmentsState extends State<ComposerAttachments> {
  final _scroll = ScrollController();

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final s = theme.sizes;
    final m = ComposerMetrics.of(context);
    final t = I18n.of(context).t;
    final edge = s.shellGap - 1;
    final fadeZone = _space6(s);
    final ids = widget.children.map((tile) => tile.id).join('|');
    final strip = LayoutGroup(
      layoutKey: ids,
      child: ListenableBuilder(
        listenable: _scroll,
        builder: (context, child) => ShaderMask(
          blendMode: BlendMode.dstIn,
          shaderCallback: (bounds) {
            var left = 0.0, right = 0.0;
            if (_scroll.hasClients) {
              final position = _scroll.position;
              final max = position.maxScrollExtent;
              if (max > 1) {
                final edges = scrollEdgeOpacities(position.pixels, max, 24);
                final rtl = Directionality.of(context) == TextDirection.rtl;
                left = rtl ? edges.bottom : edges.top;
                right = rtl ? edges.top : edges.bottom;
              }
            }
            const opaque = Color(0xFF000000);
            final stop = bounds.width > 0
                ? (fadeZone / bounds.width).clamp(0.0, 0.5)
                : 0.0;
            return LinearGradient(
              colors: [
                opaque.withValues(alpha: 1 - left),
                opaque,
                opaque,
                opaque.withValues(alpha: 1 - right),
              ],
              stops: [0, stop, 1 - stop, 1],
            ).createShader(bounds);
          },
          child: child,
        ),
        child: ScrollConfiguration(
          behavior: ScrollConfiguration.of(context)
              .copyWith(scrollbars: false, overscroll: false),
          child: SingleChildScrollView(
            controller: _scroll,
            scrollDirection: Axis.horizontal,
            // Each tile's box includes its badge's reach, so G less that reach between boxes
            // leaves G between the pictures.
            child: Row(
              spacing: math.max(0, s.shellGap - m.overhang),
              children: widget.children,
            ),
          ),
        ),
      ),
    );
    return Padding(
      padding: EdgeInsetsDirectional.only(start: edge),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(
            child: Semantics(
              container: true,
              explicitChildNodes: true,
              label: widget.label,
              child: Align(
                alignment: AlignmentDirectional.centerStart,
                child: strip,
              ),
            ),
          ),
          if (widget.max != null && widget.count != null && widget.count! > 0)
            Padding(
              padding: EdgeInsetsDirectional.only(top: m.overhang, end: edge),
              child: CssBaseline(
                lineHeight: 16,
                child: Text(
                  t('lab.composer.attachmentCount', {
                    'count': '${widget.count}',
                    'max': '${widget.max}',
                  }),
                  style: TextStyle(
                    fontSize: 12,
                    height: 16 / 12,
                    leadingDistribution: TextLeadingDistribution.even,
                    color: c.muted,
                    fontFeatures: const [FontFeature.tabularFigures()],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// One attachment tile (`ComposerAttachment` in the web kit): a rounded-square thumbnail, or, with
/// [title], a wider tile with an icon and a name; a small × badge on its top-trailing corner,
/// reaching past it and ringed in the capsule's colour; an optional [badge] such as "Main" at its
/// bottom-leading corner.
class ComposerAttachment extends StatelessWidget {
  const ComposerAttachment({
    super.key,
    required this.id,
    this.preview,
    this.icon,
    this.title,
    required this.label,
    this.badge,
    this.onRemove,
    this.removeLabel,
  });

  /// Stable identity; tiles slide into place when others are removed.
  final String id;

  /// The thumbnail (an image).
  final Widget? preview;

  /// Icon of a wide tile (a template, a document).
  final Widget? icon;

  /// Name shown on a wide tile. Without it the tile is a square thumbnail.
  final String? title;

  /// Accessible name of the tile.
  final String label;

  /// Short label on the thumbnail, such as "Main" for the primary reference.
  final String? badge;

  /// Shows the × badge.
  final VoidCallback? onRemove;

  /// Accessible name of the × badge. Defaults to the localized "Remove {label}".
  final String? removeLabel;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(StringProperty('id', id))
      ..add(StringProperty('title', title, defaultValue: null))
      ..add(StringProperty('label', label))
      ..add(StringProperty('badge', badge, defaultValue: null))
      ..add(ObjectFlagProperty<VoidCallback>.has('onRemove', onRemove))
      ..add(StringProperty('removeLabel', removeLabel, defaultValue: null));
  }

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final s = theme.sizes;
    final m = ComposerMetrics.of(context);
    final t = I18n.of(context).t;
    final space1 = _space1(s);
    final radius = math.max(m.radius - s.shellGap, 6 * s.radiusScale);
    final wide = title != null;
    final Widget body = wide
        ? Padding(
            padding: EdgeInsetsDirectional.only(
              start: _space3(s),
              end: _space3(s) + 16,
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              spacing: s.shellGap,
              children: [
                IconTheme.merge(
                  data: IconThemeData(color: c.ink, size: 20),
                  child: SizedBox.square(dimension: 20, child: icon),
                ),
                Flexible(
                  child: Text(
                    title!,
                    maxLines: 1,
                    softWrap: false,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 13,
                      height: 18 / 13,
                      fontWeight: FontWeight.w500,
                      color: c.ink,
                    ),
                  ),
                ),
              ],
            ),
          )
        : SizedBox.square(dimension: m.thumb, child: preview);
    final media = Container(
      height: m.thumb,
      constraints: BoxConstraints(
        minWidth: m.thumb,
        maxWidth: wide ? m.thumb * 3 : m.thumb,
      ),
      clipBehavior: Clip.antiAlias,
      decoration: ShapeDecoration(
        color: wide ? mixSrgb(c.primary, 0.12, c.surface) : c.surfaceSoft,
        shape: SuperellipseBorder(radius: radius),
      ),
      foregroundDecoration: ShapeDecoration(
        shape: SuperellipseBorder(
          radius: radius,
          side: BorderSide(color: mixSrgb(c.ink, 0.08, transparent)),
        ),
      ),
      child: Stack(
        alignment: AlignmentDirectional.centerStart,
        children: [
          body,
          if (badge != null)
            PositionedDirectional(
              start: space1,
              bottom: space1,
              child: ExcludeSemantics(
                child: ConstrainedBox(
                  constraints: BoxConstraints(maxWidth: m.thumb - 2 * space1),
                  child: DecoratedBox(
                    decoration: ShapeDecoration(
                      color: _scrim,
                      shape: SuperellipseBorder(radius: 8 * s.radiusScale),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 5),
                      child: CssBaseline(
                        lineHeight: 16,
                        child: Text(
                          badge!,
                          maxLines: 1,
                          softWrap: false,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 10,
                            height: 1.6,
                            fontWeight: FontWeight.w600,
                            leadingDistribution: TextLeadingDistribution.even,
                            color: _onScrim,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
    // The tile's box takes the badge's reach above and after the picture, so the badge stays
    // inside it (and reachable) on the corner.
    final tile = Stack(
      clipBehavior: Clip.none,
      children: [
        Padding(
          padding: EdgeInsetsDirectional.only(top: m.overhang, end: m.overhang),
          child: media,
        ),
        if (onRemove != null)
          PositionedDirectional(
            top: 0,
            end: 0,
            child: _RemoveBadge(
              size: m.remove,
              label:
                  removeLabel ?? t('lab.composer.removeItem', {'name': label}),
              onRemove: onRemove!,
            ),
          ),
      ],
    );
    return LayoutGroupItem(
      layoutId: id,
      child: Semantics(
        container: true,
        label: badge != null ? '$badge: $label' : label,
        child: tile,
      ),
    );
  }
}

/// The × badge: a small dark capsule (a circle) with a white ×, ringed in the capsule's colour so
/// it reads on any image, a 44px target on touch screens.
class _RemoveBadge extends StatelessWidget {
  const _RemoveBadge({
    required this.size,
    required this.label,
    required this.onRemove,
  });
  final double size;
  final String label;
  final VoidCallback onRemove;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(DoubleProperty('size', size))
      ..add(StringProperty('label', label))
      ..add(ObjectFlagProperty<VoidCallback>.has('onRemove', onRemove));
  }

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final radius = size / 2 * theme.sizes.radiusScale;
    return ControlOverrides(
      height: size,
      radius: radius,
      // `color-mix(in srgb, scrim, black 30% | 40%)` while hovered or held.
      fill: _scrim,
      hoverFill: const Color(0xB0000000),
      activeFill: const Color(0xBC000000),
      ink: _onScrim,
      child: DecoratedBox(
        position: DecorationPosition.foreground,
        decoration: ShapeDecoration(
          shape: SuperellipseBorder(
            radius: radius,
            side: BorderSide(color: theme.colors.surface, width: 2),
          ),
        ),
        child: IconButton(
          variant: ButtonVariant.ghost,
          ariaLabel: label,
          onClick: onRemove,
          icon: const LucideIcon(
            LucideIcons.x,
            size: 12,
            strokeWidth: 2.5,
            color: _onScrim,
          ),
        ),
      ),
    );
  }
}

/// The composer's floating row, in iOS 26 Liquid Glass (`ComposerBar` in the web kit): a round
/// [leading] bubble and one capsule holding the [attachments], the growing [field] and, at its
/// trailing end, the [actions] and [send]. While it is empty and idle it is one calm line; with
/// text, focus inside or [pinned], a second row shows the [tools] (ladder, settings) and the
/// actions and send move under the text. Every layout change (rows, lines, attachments) springs
/// on one `Springs.snappy`. Both bubbles share one glass container inside a [GlassBar].
class ComposerBar extends StatefulWidget {
  const ComposerBar({
    super.key,
    this.leading,
    this.attachments,
    required this.field,
    this.tools = const [],
    this.actions,
    required this.send,
    required this.hasText,
    this.pinned = false,
    this.inlineTools = false,
    this.dropActive = false,
  });

  /// Content of the round bubble before the capsule, usually one [IconButton] (+, attach).
  final Widget? leading;

  /// [ComposerAttachments] shown inside the capsule, above the text.
  final Widget? attachments;

  /// The [ComposerField].
  final Widget field;

  /// Chips on the second row's leading end (model, settings). Shown while expanded.
  final List<Widget> tools;

  /// Small icon buttons beside send (AI help). Keep it to one: it stays on the calm bar.
  final Widget? actions;

  /// The [ComposerSend].
  final Widget send;

  /// The field has text: keeps the second row open.
  final bool hasText;

  /// One of its menus or panels is open (the web kit reads open triggers): keeps it open.
  final bool pinned;

  /// Show tools beside a single-line draft. Wrap to two rows when the draft
  /// exceeds the available width, contains a newline, or is explicitly pinned.
  final bool inlineTools;

  /// Dashed outline while a compatible file is dragged over the drop target.
  final bool dropActive;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(FlagProperty('hasText', value: hasText, ifTrue: 'has text'))
      ..add(
        FlagProperty(
          'pinned',
          value: pinned,
          ifTrue: 'pinned',
          defaultValue: false,
        ),
      )
      ..add(
        FlagProperty(
          'dropActive',
          value: dropActive,
          ifTrue: 'drop active',
          defaultValue: false,
        ),
      );
  }

  @override
  State<ComposerBar> createState() => _ComposerBarState();
}

class _ComposerBarState extends State<ComposerBar> {
  bool _focusWithin = false;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final s = theme.sizes;
    final m = ComposerMetrics.of(context);
    final hasTools = widget.tools.isNotEmpty || widget.inlineTools;
    final expanded =
        hasTools &&
        (widget.inlineTools
            ? widget.pinned
            : composerExpanded(
                hasText: widget.hasText,
                focusWithin: _focusWithin,
                pinned: widget.pinned,
              ));
    final controls = ControlOverrides(
      height: m.control,
      radius: m.control / 2 * s.radiusScale,
      child: ComposerCapsuleLayout(
        expanded: expanded,
        inlineTools: widget.inlineTools,
        measureDraft: widget.inlineTools && widget.hasText,
        inset: m.inset - 1,
        rowGap: _space1(s),
        children: [
          if (widget.attachments != null)
            ComposerSlot(
              name: ComposerSlotName.attachments,
              child: widget.attachments!,
            ),
          ComposerSlot(
            name: ComposerSlotName.field,
            child: GlassOwnPress(
              behavior: HitTestBehavior.translucent,
              child: widget.field,
            ),
          ),
          if (hasTools)
            ComposerSlot(
              name: ComposerSlotName.tools,
              // Calm, the tools row is hidden and out of reach (`inert`).
              child: ExcludeFocus(
                excluding: !expanded && !widget.inlineTools,
                child: ExcludeSemantics(
                  excluding: !expanded && !widget.inlineTools,
                  child: IgnorePointer(
                    ignoring: !expanded && !widget.inlineTools,
                    // Chips take muted ink, so the prompt stays the main thing.
                    child: Builder(
                      builder: (context) => ControlOverrides.merge(
                        context,
                        ink: c.muted,
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            for (final tool in widget.tools)
                              Flexible(
                                child: widget.inlineTools
                                    ? ConstrainedBox(
                                        constraints: BoxConstraints(
                                          maxHeight: m.control,
                                        ),
                                        child: tool,
                                      )
                                    : tool,
                              ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          if (widget.actions != null)
            ComposerSlot(
              name: ComposerSlotName.actions,
              child: widget.actions!,
            ),
          ComposerSlot(name: ComposerSlotName.send, child: widget.send),
        ],
      ),
    );
    final capsule = CustomPaint(
      foregroundPainter: widget.dropActive
          ? _DropOutline(radius: m.radius, color: c.primary)
          : null,
      child: GlassGroup(
        glassMotion: GlassMotion.follow,
        radius: m.radius,
        // The layout keeps its own inset, so attachments can reach the border.
        child: ConstrainedBox(
          constraints: BoxConstraints(minHeight: m.item - 2),
          child: controls,
        ),
      ),
    );
    final leading = widget.leading == null
        ? null
        : GlassGroup(
            radius: m.radius,
            padding: const EdgeInsets.all(2),
            // A toolbar bubble: its control fills it less 2px padding and a 1px border a side.
            child: ConstrainedBox(
              constraints: BoxConstraints(minHeight: m.item - 6),
              child: ControlOverrides(
                height: m.item - 6,
                radius: m.radius - 2,
                touchTarget: m.item - 6,
                child: widget.leading!,
              ),
            ),
          );
    return _ComposerScope(
      expanded: expanded,
      child: Focus(
        canRequestFocus: false,
        skipTraversal: true,
        onFocusChange: (value) => setState(() => _focusWithin = value),
        child: GlassBar(
          child: GlassScope(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              spacing: s.toolbarGap,
              children: [
                ?leading,
                Expanded(child: capsule),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// The dashed drop outline (2px, 3px outside the capsule).
class _DropOutline extends CustomPainter {
  _DropOutline({required this.radius, required this.color});
  final double radius;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final outline = superellipsePath((Offset.zero & size).inflate(4), [
      radius + 4,
      radius + 4,
      radius + 4,
      radius + 4,
    ], inset: 1);
    final dashed = Path();
    for (final metric in outline.computeMetrics()) {
      for (var d = 0.0; d < metric.length; d += 12) {
        dashed.addPath(
          metric.extractPath(d, math.min(d + 6, metric.length)),
          Offset.zero,
        );
      }
    }
    canvas.drawPath(
      dashed,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2
        ..color = color,
    );
  }

  @override
  bool shouldRepaint(_DropOutline old) =>
      old.radius != radius || old.color != color;
}

/// The AI prompt composer (`PromptComposer` in the web kit): a round leading bubble and a glass
/// capsule whose field grows from one line, with send inside at its trailing end. Tools appear on
/// a second row while it has text or focus. Enter sends; Shift+Enter adds a line.
class PromptComposer extends StatelessWidget {
  const PromptComposer({
    super.key,
    required this.value,
    required this.onValueChange,
    required this.onSubmit,
    required this.label,
    this.placeholder,
    this.disabled = false,
    this.busy = false,
    this.onStop,
    required this.submitLabel,
    this.stopLabel,
    this.dropActive = false,
    this.submitDisabled = false,
    this.maxLength,
    this.maxLines = 6,
    this.leading,
    this.attachments,
    this.tools = const [],
    this.actions,
    this.above,
    this.footer,
    this.focusNode,
  });

  /// The prompt text (controlled).
  final String value;

  /// Called with the new text on every edit.
  final ValueChanged<String> onValueChange;

  /// Called by send and Enter, only when the prompt is not blank and submitting is allowed.
  final VoidCallback onSubmit;

  /// Accessible name of the text field.
  final String label;

  /// Animated hint shown while the field is empty.
  final String? placeholder;

  /// Disables the field and blocks submitting.
  final bool disabled;

  /// Request in flight: the field turns read-only and send shows the loader.
  final bool busy;

  /// With [busy], send becomes a stop button that calls this.
  final VoidCallback? onStop;

  /// Accessible name of send, such as "Send message".
  final String submitLabel;

  /// Accessible name of send while it stops. Defaults to the localized "Stop".
  final String? stopLabel;

  /// Highlight the capsule while a compatible file is dragged over the drop target.
  final bool dropActive;

  /// Blocks submitting without disabling the field.
  final bool submitDisabled;

  /// Maximum prompt length in characters.
  final int? maxLength;

  /// Lines the field grows to before it scrolls.
  final int maxLines;

  /// Content of the round bubble before the capsule, usually an attach or + button.
  final Widget? leading;

  /// [ComposerAttachments] inside the capsule, above the text.
  final Widget? attachments;

  /// Chips on the second row (model, mode). Shown while the composer has text or focus.
  final List<Widget> tools;

  /// Small icon buttons beside send. Keep it to one.
  final Widget? actions;

  /// Notes or suggestions above the composer.
  final Widget? above;

  /// Content below the composer, such as a caption or allowance note.
  final Widget? footer;

  /// Focus of the text field.
  final FocusNode? focusNode;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(StringProperty('value', value))
      ..add(
        ObjectFlagProperty<ValueChanged<String>>.has(
          'onValueChange',
          onValueChange,
        ),
      )
      ..add(ObjectFlagProperty<VoidCallback>.has('onSubmit', onSubmit))
      ..add(StringProperty('label', label))
      ..add(StringProperty('placeholder', placeholder, defaultValue: null))
      ..add(
        FlagProperty(
          'disabled',
          value: disabled,
          ifTrue: 'disabled',
          defaultValue: false,
        ),
      )
      ..add(
        FlagProperty('busy', value: busy, ifTrue: 'busy', defaultValue: false),
      )
      ..add(ObjectFlagProperty<VoidCallback>.has('onStop', onStop))
      ..add(StringProperty('submitLabel', submitLabel))
      ..add(StringProperty('stopLabel', stopLabel, defaultValue: null))
      ..add(
        FlagProperty(
          'dropActive',
          value: dropActive,
          ifTrue: 'drop active',
          defaultValue: false,
        ),
      )
      ..add(
        FlagProperty(
          'submitDisabled',
          value: submitDisabled,
          ifTrue: 'submit disabled',
          defaultValue: false,
        ),
      )
      ..add(IntProperty('maxLength', maxLength, defaultValue: null))
      ..add(IntProperty('maxLines', maxLines, defaultValue: 6))
      ..add(
        DiagnosticsProperty<FocusNode>(
          'focusNode',
          focusNode,
          defaultValue: null,
        ),
      );
  }

  bool get _canSubmit =>
      !disabled && !busy && !submitDisabled && value.trim().isNotEmpty;

  void _submit() {
    if (_canSubmit) onSubmit();
  }

  @override
  Widget build(BuildContext context) {
    final s = ThemeProvider.of(context).sizes;
    return Center(
      heightFactor: 1,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 780),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          spacing: s.shellGap,
          children: [
            ?above,
            ComposerBar(
              leading: leading,
              attachments: attachments,
              tools: tools,
              actions: actions,
              hasText: value.isNotEmpty,
              inlineTools: tools.isNotEmpty,
              pinned: value.contains('\n'),
              dropActive: dropActive,
              field: ComposerField(
                value: value,
                onValueChange: onValueChange,
                label: label,
                placeholder: placeholder,
                maxLength: maxLength,
                maxLines: maxLines,
                disabled: disabled,
                readOnly: busy,
                focusNode: focusNode,
                onSubmit: _submit,
              ),
              send: ComposerSend(
                label: submitLabel,
                ready: _canSubmit,
                submitting: busy,
                onSend: _submit,
                onStop: onStop,
                stopLabel: stopLabel,
              ),
            ),
            ?footer,
          ],
        ),
      ),
    );
  }
}

/// The quiet line under a composer (`.lab-composer-caption`), such as price or allowance.
class ComposerCaption extends StatelessWidget {
  const ComposerCaption({super.key, required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) => DefaultTextStyle.merge(
    textAlign: TextAlign.center,
    style: TextStyle(
      fontSize: 12,
      height: 16 / 12,
      leadingDistribution: TextLeadingDistribution.even,
      color: ThemeProvider.of(context).colors.muted,
    ),
    child: CssBaseline(lineHeight: 16, child: child),
  );
}

/// Placeholder that fades in word by word (28ms apart, 420ms each): the twin of `ComposerHint`.
/// Decorative (excluded from semantics); label the field separately. Changing [text] replays it;
/// reduced motion shows it at once.
class ComposerHint extends StatefulWidget {
  const ComposerHint({super.key, required this.text});

  /// The hint text.
  final String text;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties.add(StringProperty('text', text));
  }

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
    final reduced = reducedMotionOf(context);
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
          final direction = autoTextDirection(
            _parts.join(),
            Directionality.of(context),
          );
          // Flutter places inline widgets left to right whatever the paragraph's direction, so a
          // right-to-left hint fades its words in as text (no rise) and the paragraph orders them.
          final inline = direction == TextDirection.rtl;
          return Text.rich(
            TextSpan(
              children: [
                for (var i = 0; i < _parts.length; i++)
                  if (_parts[i].isEmpty)
                    const TextSpan()
                  else if (i.isOdd)
                    TextSpan(text: _parts[i])
                  else if (inline)
                    TextSpan(
                      text: _parts[i],
                      style: TextStyle(
                        color: color.withValues(alpha: color.a * shown(i)),
                      ),
                    )
                  else
                    WidgetSpan(
                      alignment: PlaceholderAlignment.baseline,
                      baseline: TextBaseline.alphabetic,
                      child: Opacity(
                        opacity: shown(i),
                        child: Transform.translate(
                          offset: Offset(0, 3 * (1 - shown(i))),
                          // Each word is its own run: give it the hint's direction too, or a
                          // trailing comma flips to the front on a right-to-left page.
                          child: Text(
                            _parts[i],
                            textDirection: direction,
                            style: TextStyle(color: color),
                          ),
                        ),
                      ),
                    ),
              ],
            ),
            textDirection: direction,
            textAlign: rtl ? TextAlign.right : TextAlign.left,
            maxLines: 1,
            softWrap: false,
            overflow: TextOverflow.clip,
          );
        },
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
