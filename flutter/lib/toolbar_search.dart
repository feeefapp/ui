import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/rendering.dart' show OverflowBoxFit;
import 'package:flutter/scheduler.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import 'glass/container.dart';
import 'i18n/i18n.dart';
import 'icons/lucide.dart';
import 'primitives/button.dart';
import 'primitives/spring_core.dart';
import 'scaffold.dart';
import 'theme.dart';
import 'theme/color_mix.dart';
import 'theme/css_text.dart';
import 'theme/tokens.dart';
import 'toolbar_search_motion.dart';

/// What [ToolbarSearch] hands a custom input (`renderInput`), the twin of `ToolbarSearchInputProps`
/// in the web kit. Attach [focusNode] to the editable text, show [value], report edits through
/// [onValueChange] and pass key events to [onKeyDown] (it handles Escape first).
@immutable
class ToolbarSearchInputProps {
  const ToolbarSearchInputProps({
    required this.focusNode,
    required this.label,
    required this.placeholder,
    required this.value,
    required this.disabled,
    required this.focusable,
    required this.onValueChange,
    required this.onKeyDown,
  });

  /// The input's focus node; the capsule focuses it when it opens.
  final FocusNode focusNode;

  /// Accessible name of the field.
  final String label;

  /// Placeholder text.
  final String placeholder;

  /// The query to show (the cleared query keeps showing while the capsule closes).
  final String value;

  /// Blocks editing.
  final bool disabled;

  /// False while collapsed: the field is out of the focus order (`tabIndex = -1`).
  final bool focusable;

  /// Called with the new query.
  final ValueChanged<String> onValueChange;

  /// Key handler: Escape collapses and clears, everything else reaches `onInputKeyDown`.
  final KeyEventResult Function(KeyEvent event) onKeyDown;
}

/// Search button that springs open into a field inside the same glass pill, taking the free width
/// of its row: the twin of `ToolbarSearch` in `@feeef.dev/ui/toolbar-search`. Persistent
/// material, stable control geometry and a velocity-preserving spring. Neighbouring bubbles in
/// [children] are absorbed into the search glass as it opens and grow back out of it when it
/// closes.
class ToolbarSearch extends StatefulWidget {
  const ToolbarSearch({
    super.key,
    required this.label,
    required this.value,
    required this.onValueChange,
    this.placeholder,
    this.children = const [],
    this.trailing,
    this.disabled = false,
    this.defaultExpanded = false,
    this.inputRef,
    this.renderInput,
    this.onInputKeyDown,
    this.onExpandedChange,
  });

  /// Accessible name of the search field and its trigger. Also the default placeholder.
  final String label;

  /// The query (controlled).
  final String value;

  /// Called with the new query. Collapsing clears it.
  final ValueChanged<String> onValueChange;

  /// Placeholder text. Defaults to [label].
  final String? placeholder;

  /// Controls shown next to the collapsed search button; hidden while the field is open.
  final List<Widget> children;

  /// Content after the search, always visible (it keeps its width while the field expands).
  final Widget? trailing;

  /// Blocks the trigger, the field and the clear button.
  final bool disabled;

  /// Starts open. A non-empty [value] also starts it open.
  final bool defaultExpanded;

  /// Focus node of the input (the web kit's input ref), e.g. to focus it from outside.
  final FocusNode? inputRef;

  /// Replaces the default input, e.g. with a combobox; wire the given props into it.
  final Widget Function(BuildContext context, ToolbarSearchInputProps props)?
  renderInput;

  /// Key handler for the input. Escape is handled first: it collapses and clears.
  final KeyEventResult Function(KeyEvent event)? onInputKeyDown;

  /// Called when the field opens or collapses.
  final ValueChanged<bool>? onExpandedChange;

  @override
  State<ToolbarSearch> createState() => _ToolbarSearchState();
}

class _ToolbarSearchState extends State<ToolbarSearch>
    with SingleTickerProviderStateMixin {
  static int _serial = 0;
  final String _id = 'lab-toolbar-search-${_serial++}';
  late bool _expanded = widget.defaultExpanded || widget.value.isNotEmpty;
  bool _moving = false;
  String _closingValue = '';
  final _trigger = FocusNode(debugLabel: 'ToolbarSearch trigger');
  late final _ownField = FocusNode(debugLabel: 'ToolbarSearch field');
  FocusNode get _field => widget.inputRef ?? _ownField;
  late final Ticker _ticker = createTicker(_tick);
  Duration _last = Duration.zero;
  StepSpringState _spring = (position: 0, velocity: 0);
  double _target = 0, _compact = 46, _wide = 46;
  bool _measured = false;

  @override
  void initState() {
    super.initState();
    // Like the web layout effect: an open capsule takes focus when it mounts.
    if (_expanded) _focusFieldSoon();
  }

  @override
  void dispose() {
    _ticker.dispose();
    _trigger.dispose();
    _ownField.dispose();
    super.dispose();
  }

  bool get _reduced => MediaQuery.maybeDisableAnimationsOf(context) ?? false;

  void _focusFieldSoon() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && _expanded) _field.requestFocus();
    });
  }

  void _run() {
    if (!mounted) return;
    if (_reduced) {
      _ticker.stop();
      setState(() {
        _spring = (position: _target, velocity: 0);
        _moving = false;
      });
      return;
    }
    if (!_moving) setState(() => _moving = true);
    if (_ticker.isActive) return;
    _last = Duration.zero;
    _ticker.start();
  }

  void _tick(Duration now) {
    final elapsed = (now - _last).inMicroseconds / 1e6;
    _last = now;
    var next = stepSearchMorph(_spring, _target, elapsed);
    var done = false;
    if (searchMorphSettled(next, _target)) {
      next = (position: _target, velocity: 0);
      done = true;
    }
    setState(() {
      _spring = next;
      if (done) _moving = false;
    });
    if (done) _ticker.stop();
  }

  void _change(bool next) {
    if (next == _expanded) return;
    if (!next) {
      _closingValue = widget.value;
      if (widget.value.isNotEmpty) widget.onValueChange('');
      _trigger.requestFocus();
    }
    setState(() {
      _moving = true;
      _expanded = next;
    });
    widget.onExpandedChange?.call(next);
    _target = next ? _wide : _compact;
    if (_spring.position != _target) {
      _run();
    } else {
      setState(() => _moving = false);
    }
    if (next) _focusFieldSoon();
  }

  KeyEventResult _keyDown(KeyEvent event) {
    if (event is KeyDownEvent &&
        event.logicalKey == LogicalKeyboardKey.escape) {
      _change(false);
      return KeyEventResult.handled;
    }
    return widget.onInputKeyDown?.call(event) ?? KeyEventResult.ignored;
  }

  /// `--lab-toolbar-control-size`: compact, 44px on touch or narrow screens (as ToolbarGroup).
  double _controlSize(BuildContext context, ThemeData theme) {
    final narrow = (MediaQuery.maybeSizeOf(context)?.width ?? 1000) <= 600;
    return theme.coarsePointer(context) || narrow
        ? 44.0
        : theme.sizes.controlCompact;
  }

  /// Follows the host's width like the web ResizeObserver: the first measure jumps, later ones
  /// spring.
  void _measure(double compact, double width) {
    final wide = math.max(compact, width);
    if (_measured && compact == _compact && wide == _wide) return;
    _compact = compact;
    _wide = wide;
    _target = _expanded ? _wide : _compact;
    if (!_measured) {
      _measured = true;
      _spring = (position: _target, velocity: 0);
      return;
    }
    if (_spring.position != _target) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _run());
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final t = I18n.of(context).t;
    final s = theme.sizes;
    final size = _controlSize(context, theme);
    final space1 = s.density == Density.thin ? 2.0 : 4.0;
    final space2 = s.density == Density.thin ? 6.0 : 8.0;
    final space3 = switch (s.density) {
      Density.comfortable => 12.0,
      Density.compact => 10.0,
      Density.thin => 8.0,
    };
    final shownValue = _expanded
        ? widget.value
        : _moving
        ? _closingValue
        : widget.value;
    final props = ToolbarSearchInputProps(
      focusNode: _field,
      label: widget.label,
      placeholder: widget.placeholder ?? widget.label,
      value: shownValue,
      disabled: widget.disabled,
      focusable: _expanded,
      onValueChange: widget.onValueChange,
      onKeyDown: _keyDown,
    );
    final rtl = Directionality.of(context) == TextDirection.rtl;

    Widget main = LayoutBuilder(
      builder: (context, constraints) {
        final compact = size + 6;
        _measure(
          compact,
          constraints.hasBoundedWidth ? constraints.maxWidth : compact,
        );
        final opacity = searchMorphVisibility(
          searchMorphProgress(_spring.position, _compact, _wide),
        );
        final inert = _expanded || _moving;
        final radius = (size + 6) / 2 * s.radiusScale;
        final surface = SizedBox(
          width: _spring.position,
          child: Semantics(
            container: true,
            explicitChildNodes: true,
            label: widget.label,
            child: GlassGroup(
              glassId: '$_id-surface',
              glassMotion: GlassMotion.follow,
              radius: radius,
              padding: const EdgeInsets.all(2),
              child: ConstrainedBox(
                constraints: BoxConstraints(minHeight: size),
                child: ControlOverrides(
                  height: size,
                  radius: radius - 2,
                  child: Row(
                    children: [
                      Semantics(
                        expanded: _expanded,
                        child: IconButton(
                          variant: ButtonVariant.text,
                          appearance: ButtonAppearance.toolbar,
                          controlSize: ControlSize.compact,
                          focusNode: _trigger,
                          ariaLabel: _expanded
                              ? t('lab.search.collapse')
                              : widget.label,
                          disabled: widget.disabled,
                          onClick: () => _change(!_expanded),
                          icon: _SearchGlyph(expanded: _expanded, rtl: rtl),
                        ),
                      ),
                      Expanded(
                        child: _Editor(
                          expanded: _expanded,
                          opacity: opacity.editor,
                          minWidth: size + space1 * 2 + 1,
                          children: [
                            Expanded(
                              child: widget.renderInput != null
                                  ? widget.renderInput!(context, props)
                                  : _SearchInput(
                                      props: props,
                                      height: size,
                                      paddingInline: space1,
                                    ),
                            ),
                            IconButton(
                              variant: ButtonVariant.text,
                              appearance: ButtonAppearance.toolbar,
                              controlSize: ControlSize.compact,
                              ariaLabel: t('lab.search.clear'),
                              disabled: widget.value.isEmpty || widget.disabled,
                              onClick: () {
                                if (widget.value.isNotEmpty) {
                                  widget.onValueChange('');
                                }
                                _field.requestFocus();
                              },
                              icon: const LucideX(),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        );
        return Stack(
          alignment: AlignmentDirectional.topStart,
          clipBehavior: Clip.none,
          children: [
            if (widget.children.isNotEmpty)
              Padding(
                padding: EdgeInsetsDirectional.only(start: _compact + space2),
                child: IgnorePointer(
                  ignoring: inert,
                  child: ExcludeFocus(
                    excluding: inert,
                    child: ExcludeSemantics(
                      excluding: inert,
                      child: Opacity(
                        opacity: opacity.controls,
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: widget.children,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            // z-index 1: the capsule grows over the neighbours it absorbs.
            surface,
          ],
        );
      },
    );

    return Semantics(
      container: true,
      explicitChildNodes: true,
      label: widget.label,
      child: GlassScope(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          spacing: space3,
          children: [
            Expanded(child: main),
            ?widget.trailing,
          ],
        ),
      ),
    );
  }
}

/// The search glyph and the back arrow, crossfading with a 45° turn and a 75% scale (opacity
/// 160ms ease, transform 300ms `--lab-ease`). The arrow mirrors in right-to-left layouts.
class _SearchGlyph extends StatelessWidget {
  const _SearchGlyph({required this.expanded, required this.rtl});
  final bool expanded, rtl;

  @override
  Widget build(BuildContext context) {
    final reduced = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
    final fade = reduced ? Duration.zero : const Duration(milliseconds: 160);
    final turn = reduced ? Duration.zero : const Duration(milliseconds: 300);
    Widget layer(Widget icon, bool shown, double hiddenTurns) =>
        AnimatedOpacity(
          opacity: shown ? 1 : 0,
          duration: fade,
          curve: Curves.ease,
          child: AnimatedRotation(
            turns: shown ? 0 : hiddenTurns,
            duration: turn,
            curve: MotionTokens.ease,
            child: AnimatedScale(
              scale: shown ? 1 : .75,
              duration: turn,
              curve: MotionTokens.ease,
              child: icon,
            ),
          ),
        );
    return Stack(
      alignment: Alignment.center,
      children: [
        layer(const LucideSearch(), !expanded, 45 / 360),
        layer(
          Transform.flip(flipX: rtl, child: const LucideArrowLeft()),
          expanded,
          -45 / 360,
        ),
      ],
    );
  }
}

/// `.lab-toolbar-search-editor`: the field and its clear button, faded by the morph and inert
/// while collapsed. Below [minWidth] (the closed capsule) it keeps its layout and is clipped,
/// where the web editor would overflow invisibly.
class _Editor extends StatelessWidget {
  const _Editor({
    required this.expanded,
    required this.opacity,
    required this.minWidth,
    required this.children,
  });
  final bool expanded;
  final double opacity, minWidth;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => IgnorePointer(
    ignoring: !expanded,
    child: ExcludeFocus(
      excluding: !expanded,
      child: ExcludeSemantics(
        excluding: !expanded,
        child: Opacity(
          opacity: opacity,
          child: LayoutBuilder(
            builder: (context, constraints) {
              final row = Row(children: children);
              if (constraints.maxWidth >= minWidth) return row;
              return ClipRect(
                child: OverflowBox(
                  alignment: AlignmentDirectional.centerStart,
                  minWidth: minWidth,
                  maxWidth: minWidth,
                  fit: OverflowBoxFit.deferToChild,
                  child: row,
                ),
              );
            },
          ),
        ),
      ),
    ),
  );
}

/// The default unpainted input (`RawInput` with `.lab-toolbar-search-input`): the toolbar control
/// height, `--lab-space-1` inline padding, inherited font, muted placeholder.
class _SearchInput extends StatefulWidget {
  const _SearchInput({
    required this.props,
    required this.height,
    required this.paddingInline,
  });
  final ToolbarSearchInputProps props;
  final double height, paddingInline;

  @override
  State<_SearchInput> createState() => _SearchInputState();
}

class _SearchInputState extends State<_SearchInput>
    implements TextSelectionGestureDetectorBuilderDelegate {
  late final _controller = TextEditingController(text: widget.props.value);
  late final _gestures = TextSelectionGestureDetectorBuilder(delegate: this);
  final _editableKey = GlobalKey<EditableTextState>();

  @override
  GlobalKey<EditableTextState> get editableTextKey => _editableKey;
  @override
  bool get forcePressEnabled => false;
  @override
  bool get selectionEnabled => !widget.props.disabled;

  @override
  void initState() {
    super.initState();
    _controller.addListener(_changed);
  }

  @override
  void didUpdateWidget(_SearchInput old) {
    super.didUpdateWidget(old);
    final value = widget.props.value;
    if (value != _controller.text) {
      _controller.value = TextEditingValue(
        text: value,
        selection: TextSelection.collapsed(offset: value.length),
      );
    }
  }

  @override
  void dispose() {
    _controller.removeListener(_changed);
    _controller.dispose();
    super.dispose();
  }

  void _changed() {
    if (_controller.text != widget.props.value) {
      widget.props.onValueChange(_controller.text);
    }
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final c = ThemeProvider.of(context).colors;
    final props = widget.props;
    final style = DefaultTextStyle.of(context).style;
    final fontSize = style.fontSize ?? 14;
    final lineHeight = (style.height ?? 20 / 14) * fontSize;
    final empty = _controller.text.isEmpty;
    final editable = EditableText(
      key: _editableKey,
      controller: _controller,
      focusNode: props.focusNode,
      readOnly: props.disabled,
      style: style.copyWith(
        color: c.ink,
        height: lineHeight / fontSize,
        leadingDistribution: TextLeadingDistribution.even,
      ),
      cursorColor: c.focus,
      backgroundCursorColor: c.muted,
      cursorWidth: 1,
      selectionColor: mixSrgb(c.focus, 0.28, transparent),
      selectionHeightStyle: ui.BoxHeightStyle.max,
      enableInteractiveSelection: !props.disabled,
      rendererIgnoresPointer: true,
      maxLines: 1,
      textInputAction: TextInputAction.search,
      mouseCursor: SystemMouseCursors.text,
    );
    return Semantics(
      label: props.label,
      textField: true,
      enabled: !props.disabled,
      child: Focus(
        canRequestFocus: false,
        skipTraversal: true,
        onKeyEvent: (_, event) {
          // Escape while an IME composes belongs to the IME.
          if (event.logicalKey == LogicalKeyboardKey.escape &&
              _controller.value.composing.isValid) {
            return KeyEventResult.ignored;
          }
          return props.onKeyDown(event);
        },
        child: MouseRegion(
          cursor: props.disabled
              ? SystemMouseCursors.forbidden
              : SystemMouseCursors.text,
          child: _gestures.buildGestureDetector(
            behavior: HitTestBehavior.translucent,
            child: SizedBox(
              height: widget.height,
              child: Padding(
                padding: EdgeInsetsDirectional.symmetric(
                  horizontal: widget.paddingInline,
                ),
                child: Align(
                  alignment: AlignmentDirectional.centerStart,
                  child: Stack(
                    children: [
                      if (empty)
                        IgnorePointer(
                          child: CssBaseline(
                            lineHeight: lineHeight,
                            child: Text(
                              props.placeholder,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: style.copyWith(
                                color: c.muted,
                                height: lineHeight / fontSize,
                                leadingDistribution:
                                    TextLeadingDistribution.even,
                              ),
                            ),
                          ),
                        ),
                      CssBaseline(lineHeight: lineHeight, child: editable),
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
