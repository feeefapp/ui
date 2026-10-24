import 'package:flutter/widgets.dart';

import '../dock/dock.dart';
import '../i18n/i18n.dart';

/// The actions of a presentation surface in one floating glass [Dock]. Put it in a surface's
/// `dock` (or a [PresentationBody]'s `bottom`) so the actions never scroll away. The twin of
/// `PresentationDock` in `@feeef.dev/ui/presentation`.
class PresentationDock extends StatelessWidget {
  const PresentationDock({
    super.key,
    this.label,
    this.content,
    required this.children,
  });

  /// Accessible name of the group. Default “Actions”.
  final String? label;

  /// A compact status before the actions (“3 selected”).
  final Widget? content;

  /// The surface's actions: Cancel as `text`, the one main action `filled`, last.
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Dock(
    label: label ?? I18n.of(context).t('lab.presentation.actions'),
    content: content,
    children: children,
  );
}
