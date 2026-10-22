import 'dart:math' as math;

import 'package:flutter/rendering.dart';
import 'package:flutter/widgets.dart';

import '../glass/container.dart';
import '../primitives/button.dart';
import '../primitives/modal.dart';
import '../primitives/segmented.dart';
import '../theme.dart';
import '../toolbar.dart';
import 'temporal.dart';
import 'temporal_editor.dart';

/// A temporal picker as a dialog, two levels deep and nothing more: the twin of `TemporalDialog`
/// in `@feeef.dev/ui/filters/temporal-dialog`. The dialog, then one row of glass groups above
/// (start/end switch, scrolling presets) and one below (Cancel · Clear · Apply); the calendars and
/// times scroll between them. There is no title bar and no close button; Cancel, Escape and the
/// backdrop close it. Keep it mounted and toggle [open]; it needs an [Overlay] above it.
class TemporalDialog extends StatelessWidget {
  const TemporalDialog({
    super.key,
    required this.open,
    required this.label,
    required this.close,
    this.returnFocus,
    this.onApply,
    this.onClear,
    this.clearLabel = const Text('Clear'),
    this.clearDisabled = false,
    this.applyLabel = const Text('Apply'),
    this.showApply = true,
    this.error,
    this.intro,
    this.dir,
    required this.config,
    required this.value,
    required this.onChange,
    this.onPick,
    this.locale,
  });

  /// Shows the dialog. Changing it also resets the editor's month and active end.
  final bool open;

  /// Accessible name of the dialog; also its title when there is no top bar.
  final String label;

  /// Called by Cancel, Escape and the backdrop.
  final VoidCallback close;

  /// Focus target after closing, usually the trigger (the web kit's `returnFocusRef`).
  final FocusNode? returnFocus;

  /// Apply: validate, commit and close (the web kit's form `onSubmit`).
  final VoidCallback? onApply;

  /// Clear action; omitted means no Clear button.
  final VoidCallback? onClear;

  /// Clear button content.
  final Widget clearLabel;

  /// Disables Clear (nothing to clear).
  final bool clearDisabled;

  /// Apply button content.
  final Widget applyLabel;

  /// False for pickers that commit on pick (a single date).
  final bool showApply;

  /// Validation message shown under the calendars.
  final Widget? error;

  /// Optional sentence above the calendars.
  final Widget? intro;

  /// Direction of the bars and content; the ambient direction when null.
  final TextDirection? dir;

  /// Type, bounds, step and presets.
  final TemporalConfig config;

  /// Current draft value.
  final TemporalValue? value;

  /// Called on every pick, preset or edit.
  final ValueChanged<TemporalValue?> onChange;

  /// Called when a choice is complete on its own: a day in a date picker, or a preset.
  final ValueChanged<TemporalValue?>? onPick;

  /// Locale for names; the I18n locale when null.
  final String? locale;

  @override
  Widget build(BuildContext context) => TemporalEditorBuilder(
    options: TemporalEditorOptions(
      config: config,
      value: value,
      onChange: onChange,
      onPick: onPick,
      locale: locale,
      resetKey: open,
    ),
    builder: (context, editor) {
      Widget directed(Widget child) => dir == null
          ? child
          : Directionality(textDirection: dir!, child: child);
      final edges = editor.range && editor.hasCalendar;
      final presets = editor.presets.isNotEmpty;
      // `.lab-temporal-dialog-bar`: one wrapping row of groups. The start/end switch grows from
      // its own width, the presets from 240px; both share what is left of their line.
      final Widget top;
      if (edges || presets) {
        top = _DialogBar(
          gap: 8,
          bases: [if (edges) null, if (presets) 240],
          children: [
            if (edges)
              ToolbarGroup(
                label: 'Range ends',
                children: [
                  Expanded(
                    child: TemporalEdges(
                      editor: editor,
                      appearance: SegmentedAppearance.plain,
                    ),
                  ),
                ],
              ),
            if (presets)
              ToolbarGroup(
                label: 'Quick choices',
                children: [
                  Expanded(
                    child: TemporalPresets(
                      editor: editor,
                      layout: TemporalPresetsLayout.bar,
                    ),
                  ),
                ],
              ),
          ],
        );
      } else {
        top = SizedBox(
          width: double.infinity,
          child: ToolbarGroup(
            label: 'Dialog title',
            children: [
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: Semantics(
                    header: true,
                    // `.lab-dialog .lab-modal-title`: 17px / 24px, 600, -0.02em.
                    child: Text(
                      label,
                      maxLines: 1,
                      softWrap: false,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 17,
                        height: 24 / 17,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 17 * -0.02,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      }
      final bottom = SizedBox(
        width: double.infinity,
        child: ToolbarGroup(
          label: '$label actions',
          children: [
            Button(
              appearance: ButtonAppearance.toolbar,
              controlSize: ControlSize.compact,
              onClick: close,
              children: const [Text('Cancel')],
            ),
            const Spacer(),
            if (onClear != null)
              Button(
                appearance: ButtonAppearance.toolbar,
                controlSize: ControlSize.compact,
                disabled: clearDisabled,
                onClick: onClear,
                children: [clearLabel],
              ),
            if (showApply)
              Button(
                variant: ButtonVariant.filled,
                appearance: ButtonAppearance.toolbar,
                controlSize: ControlSize.compact,
                onClick: onApply,
                children: [applyLabel],
              ),
          ],
        ),
      );
      final colors = ThemeProvider.of(context).colors;
      return Modal(
        open: open,
        label: label,
        close: close,
        scrollable: true,
        fitContent: true,
        headerless: true,
        showClose: false,
        returnFocus: returnFocus,
        // `.lab-temporal-dialog`: 400px, 680px with two months; nearly full width on phones.
        width: MediaQuery.sizeOf(context).width < 600
            ? MediaQuery.sizeOf(context).width - 16
            : (edges ? 680 : 400),
        // Content starts where the buttons inside the bars start (bar inset + the group's 2px
        // padding).
        scrollOptions: const ScrollOptions(edgeGap: 12, contentPadding: 14),
        top: directed(GlassScope(child: top)),
        bottom: directed(GlassScope(child: bottom)),
        child: directed(
          Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: 12,
            children: [
              if (intro != null)
                DefaultTextStyle.merge(
                  style: TextStyle(
                    color: colors.muted,
                    fontSize: 13,
                    height: 19 / 13,
                  ),
                  child: intro!,
                ),
              TemporalBody(editor: editor, onSubmit: onApply),
              if (error != null) TemporalError(child: error!),
            ],
          ),
        ),
      );
    },
  );
}

/// `.lab-filter-error`: a 12px danger-coloured message announced as it appears.
class TemporalError extends StatelessWidget {
  const TemporalError({super.key, required this.child});

  /// The message.
  final Widget child;

  @override
  Widget build(BuildContext context) => Semantics(
    liveRegion: true,
    container: true,
    child: DefaultTextStyle.merge(
      style: TextStyle(
        color: ThemeProvider.of(context).colors.danger,
        fontSize: 12,
      ),
      child: child,
    ),
  );
}

/// `.lab-temporal-dialog-bar` with its groups' flex rules: a wrapping row ([gap] between items and
/// lines) whose items start from a basis (their own max-content width when null), share the free
/// space of their line equally and stretch to the line's height.
class _DialogBar extends MultiChildRenderObjectWidget {
  const _DialogBar({
    required this.gap,
    required this.bases,
    required super.children,
  });

  final double gap;
  final List<double?> bases;

  @override
  RenderObject createRenderObject(BuildContext context) =>
      _RenderDialogBar(gap, bases, Directionality.of(context));

  @override
  void updateRenderObject(BuildContext context, _RenderDialogBar renderObject) {
    renderObject
      ..gap = gap
      ..bases = bases
      ..textDirection = Directionality.of(context);
  }
}

class _DialogBarData extends ContainerBoxParentData<RenderBox> {}

class _RenderDialogBar extends RenderBox
    with
        ContainerRenderObjectMixin<RenderBox, _DialogBarData>,
        RenderBoxContainerDefaultsMixin<RenderBox, _DialogBarData> {
  _RenderDialogBar(this._gap, this._bases, this._textDirection);

  double _gap;
  set gap(double value) {
    if (value == _gap) return;
    _gap = value;
    markNeedsLayout();
  }

  List<double?> _bases;
  set bases(List<double?> value) {
    _bases = value;
    markNeedsLayout();
  }

  TextDirection _textDirection;
  set textDirection(TextDirection value) {
    if (value == _textDirection) return;
    _textDirection = value;
    markNeedsLayout();
  }

  @override
  void setupParentData(RenderBox child) {
    if (child.parentData is! _DialogBarData) {
      child.parentData = _DialogBarData();
    }
  }

  List<RenderBox> get _children {
    final list = <RenderBox>[];
    var child = firstChild;
    while (child != null) {
      list.add(child);
      child = childAfter(child);
    }
    return list;
  }

  @override
  void performLayout() {
    final width = constraints.maxWidth;
    final children = _children;
    final bases = [
      for (var i = 0; i < children.length; i++)
        math.min(
          width,
          (i < _bases.length ? _bases[i] : null) ??
              children[i].getMaxIntrinsicWidth(double.infinity),
        ),
    ];
    // Lines, filled greedily like `flex-wrap: wrap`.
    final lines = <List<int>>[];
    var used = 0.0;
    for (var i = 0; i < children.length; i++) {
      if (lines.isEmpty || used + _gap + bases[i] > width) {
        lines.add([i]);
        used = bases[i];
      } else {
        lines.last.add(i);
        used += _gap + bases[i];
      }
    }
    var y = 0.0;
    for (final line in lines) {
      final taken =
          line.fold<double>(0, (sum, i) => sum + bases[i]) +
          _gap * (line.length - 1);
      final share = math.max(0.0, width - taken) / line.length;
      var height = 0.0;
      for (final i in line) {
        children[i].layout(
          BoxConstraints.tightFor(width: bases[i] + share),
          parentUsesSize: true,
        );
        height = math.max(height, children[i].size.height);
      }
      var x = 0.0;
      for (final i in line) {
        final child = children[i];
        if (child.size.height != height) {
          child.layout(
            BoxConstraints.tightFor(width: bases[i] + share, height: height),
            parentUsesSize: true,
          );
        }
        (child.parentData! as _DialogBarData).offset = Offset(
          _textDirection == TextDirection.rtl
              ? width - x - child.size.width
              : x,
          y,
        );
        x += child.size.width + _gap;
      }
      y += height + _gap;
    }
    size = constraints.constrain(
      Size(width, math.max(0, y - (lines.isEmpty ? 0 : _gap))),
    );
  }

  @override
  void paint(PaintingContext context, Offset offset) =>
      defaultPaint(context, offset);

  @override
  bool hitTestChildren(BoxHitTestResult result, {required Offset position}) =>
      defaultHitTestChildren(result, position: position);
}
