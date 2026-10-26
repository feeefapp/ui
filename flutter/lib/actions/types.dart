import 'dart:async';

import 'package:flutter/widgets.dart' hide Action;

import '../primitives/button.dart';

/// Whether an action shows its label or only its icon.
enum ActionDisplay { label, icon }

/// Any entry of an `ActionsBar`: the twin of `Action` in `@feeef.dev/ui/actions`. The name
/// shadows Flutter's `Action`; import `widgets.dart` with `hide Action` next to the kit.
sealed class Action {
  const Action({
    required this.id,
    required this.label,
    this.icon,
    this.display = ActionDisplay.label,
    this.tooltip,
    this.priority = 0,
    this.disabled = false,
    this.loading = false,
    this.destructive = false,
    this.variant,
    this.appearance,
  });

  /// Unique throughout this bar's action tree.
  final String id;

  /// Required accessible name; also used for menu rows.
  final String label;

  /// Icon shown before the label, and in menu rows.
  final Widget? icon;

  /// Icon mode falls back to the label when no icon is supplied.
  final ActionDisplay display;

  /// Tooltip text. Icon-only controls default to the label.
  final String? tooltip;

  /// Lower priorities spill first; source order is kept in both places.
  final double priority;

  /// Shown but not clickable, inline and in the menu.
  final bool disabled;

  /// Shows a loader and blocks activation, for work the owner tracks itself.
  final bool loading;

  /// Paints the action as destructive, inline and in the menu.
  final bool destructive;

  /// Button emphasis when shown inline. Defaults to quiet toolbar chrome.
  final ButtonVariant? variant;
  final ButtonAppearance? appearance;
}

/// A command. A returned future shows a loader and blocks repeats until it completes.
final class CommandAction extends Action {
  const CommandAction({
    required super.id,
    required super.label,
    required this.onAction,
    super.icon,
    super.display,
    super.tooltip,
    super.priority,
    super.disabled,
    super.loading,
    super.destructive,
    super.variant,
    super.appearance,
  });

  final FutureOr<void> Function() onAction;
}

/// An on/off action: pressed inline, a checkable item in menus. Controlled.
final class ToggleAction extends Action {
  const ToggleAction({
    required super.id,
    required super.label,
    required this.checked,
    required this.onCheckedChange,
    super.icon,
    super.display,
    super.tooltip,
    super.priority,
    super.disabled,
    super.loading,
    super.destructive,
    super.variant,
    super.appearance,
  });

  final bool checked;
  final FutureOr<void> Function(bool checked) onCheckedChange;
}

/// A menu of further actions (groups may nest). An empty group is disabled.
final class GroupAction extends Action {
  const GroupAction({
    required super.id,
    required super.label,
    required this.actions,
    this.onOpen,
    super.icon,
    super.display,
    super.tooltip,
    super.priority,
    super.disabled,
    super.loading,
    super.destructive,
    super.variant,
    super.appearance,
  });

  final List<Action> actions;

  /// Return false to cancel opening, for example when nothing is selected.
  final bool Function()? onOpen;
}
