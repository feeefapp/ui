import 'package:flutter/widgets.dart';

import '../glass/container.dart';
import '../i18n/i18n.dart';
import '../icons/lucide.dart';
import '../primitives/button.dart';
import '../theme.dart';
import '../theme/css_text.dart';
import '../toolbar.dart';

/// The floating header of a presentation surface (Modal, Sheet): a title bubble at the
/// start, optional [trailing] bubbles and a close bubble at the end, glass in one [GlassScope]
/// so they merge and share light. The twin of `PresentationHeader` in
/// `@feeef.dev/ui/presentation`. Put it in a [PresentationBody]'s `top`; it draws nothing when it
/// has nothing to show.
class PresentationHeader extends StatelessWidget {
  const PresentationHeader({
    super.key,
    this.title,
    this.leading,
    this.trailing = const [],
    this.onClose,
    this.closeLabel,
    this.closeDisabled = false,
  });

  /// The title, in a glass bubble at the start.
  final Widget? title;

  /// Custom content at the start instead of the title bubble (a search field, a back button with
  /// a heading).
  final Widget? leading;

  /// More bubbles before the close bubble: a Reset, a Done, a view switch.
  final List<Widget> trailing;

  /// Shows the close bubble at the end and is called when it is pressed.
  final VoidCallback? onClose;

  /// Accessible name of the close button. Default “Close”.
  final String? closeLabel;

  /// Disables the close button (while a save runs, say). A leaving surface keeps its look: closing
  /// twice does nothing.
  final bool closeDisabled;

  @override
  Widget build(BuildContext context) {
    final title = this.title;
    final leading = this.leading;
    final onClose = this.onClose;
    if (title == null &&
        leading == null &&
        trailing.isEmpty &&
        onClose == null) {
      return const SizedBox.shrink();
    }
    final i18n = I18n.of(context);
    return GlassScope(
      child: Row(
        // --lab-toolbar-gap (the shell gap G by default) between the bubbles.
        spacing: ThemeProvider.of(context).sizes.toolbarGap,
        children: [
          Expanded(
            child: Align(
              alignment: AlignmentDirectional.centerStart,
              child:
                  leading ??
                  (title == null
                      ? const SizedBox.shrink()
                      : ToolbarGroup(
                          label: i18n.t('lab.presentation.title'),
                          children: [
                            Flexible(child: PresentationTitle(child: title)),
                          ],
                        )),
            ),
          ),
          ...trailing,
          if (onClose != null)
            CloseBubble(
              label: closeLabel ?? i18n.t('lab.common.close'),
              disabled: closeDisabled,
              onClose: onClose,
            ),
        ],
      ),
    );
  }
}

/// `.lab-presentation-title`: a header title, 15/20 semibold, one line, 10px inline padding.
class PresentationTitle extends StatelessWidget {
  const PresentationTitle({super.key, required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 10),
    child: DefaultTextStyle.merge(
      style: const TextStyle(
        fontSize: 15,
        height: 20 / 15,
        leadingDistribution: TextLeadingDistribution.even,
        fontWeight: FontWeight.w600,
        letterSpacing: 15 * -0.01,
      ),
      maxLines: 1,
      softWrap: false,
      overflow: TextOverflow.ellipsis,
      child: CssBaseline(
        lineHeight: 20,
        child: Semantics(header: true, child: child),
      ),
    ),
  );
}

/// The close bubble: one glass group holding the close button (the header's, and the one
/// floating beside a sheet's pane).
class CloseBubble extends StatelessWidget {
  const CloseBubble({
    super.key,
    required this.label,
    required this.onClose,
    this.disabled = false,
  });

  /// Accessible name of the button.
  final String label;
  final VoidCallback onClose;
  final bool disabled;

  @override
  Widget build(BuildContext context) => ToolbarGroup(
    label: label,
    children: [
      IconButton(
        appearance: ButtonAppearance.toolbar,
        controlSize: ControlSize.regular,
        ariaLabel: label,
        onClick: disabled ? null : onClose,
        icon: const LucideX(size: 20),
      ),
    ],
  );
}
