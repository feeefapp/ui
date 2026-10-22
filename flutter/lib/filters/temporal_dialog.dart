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
      final edgesGroup = ToolbarGroup(
        label: 'Range ends',
        children: [
          TemporalEdges(editor: editor, appearance: SegmentedAppearance.plain),
        ],
      );
      final presetsGroup = SizedBox(
        width: double.infinity,
        child: ToolbarGroup(
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
      );
      final Widget top;
      if (edges || presets) {
        top = LayoutBuilder(
          builder: (context, constraints) {
            if (edges && presets && constraints.maxWidth >= 560) {
              return Row(
                spacing: 8,
                children: [
                  edgesGroup,
                  Expanded(child: presetsGroup),
                ],
              );
            }
            return Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              spacing: 8,
              children: [if (edges) edgesGroup, if (presets) presetsGroup],
            );
          },
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
                    child: Text(
                      label,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w600),
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
        headerless: true,
        showClose: false,
        wide: edges,
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
                    height: 1.45,
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
