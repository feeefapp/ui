import 'dart:math' as math;

import 'package:flutter/widgets.dart';

import '../brand/logo.dart';
import '../i18n/i18n.dart';
import '../primitives/layout.dart';
import '../theme.dart';
import '../theme/css_text.dart';
import '../toolbar.dart';

/// Logo box of the header brand for a viewport width (`--lab-navigation-logo-width/height`):
/// 100 × 27, 88 × 24 at ≤ 600px, 60 × 18 at ≤ 340px.
Size workspaceHeaderLogoSize(double viewportWidth) => viewportWidth <= 340
    ? const Size(60, 18)
    : viewportWidth <= 600
    ? const Size(88, 24)
    : const Size(100, 27);

/// Floating workspace header: a glass group with the sidebar toggle and logo, the page title and
/// detail, then optional [tools] and [actions] groups at the end. Pages supply context and
/// commands, never a second navbar skin. The twin of `WorkspaceHeader` in
/// `@feeef.dev/ui/navigation/workspace-header`.
///
/// The web header is `position: fixed` 16px from the viewport edges unless [embedded]; in Flutter
/// place it yourself (a Stack's `Positioned(top: 16, left: 16, right: 16)`, or a scaffold app bar
/// slot). It is 46px tall, or at least 54px when [embedded]. At ≤ 900px the title and detail hide,
/// and the logo shrinks at ≤ 600px and ≤ 340px, like the web media queries.
class WorkspaceHeader extends StatelessWidget {
  const WorkspaceHeader({
    super.key,
    required this.toggle,
    required this.title,
    this.detail,
    this.actions,
    this.tools,
    this.toolsLabel,
    this.embedded = false,
    this.brandHref = '/',
    this.onBrandClick,
    this.brandLabel = 'Feeef',
    this.brandSuffix,
  });

  /// The sidebar toggle, shown before the logo (e.g. ScaffoldToggleButton).
  final Widget toggle;

  /// Current page title.
  final String title;

  /// Secondary line after the title.
  final String? detail;

  /// Primary page commands, in their own glass group at the end.
  final List<Widget>? actions;

  /// View controls (zoom, layout, settings), in a group before [actions].
  final List<Widget>? tools;

  /// Accessible name of the tools group.
  final String? toolsLabel;

  /// For headers placed inside a panel instead of floating over the page (`data-embedded`).
  final bool embedded;

  /// Where the logo links; each product passes its own home. Announced as the link's URL.
  final String brandHref;

  /// Called when the logo link is activated (Flutter routes here; the web follows [brandHref]).
  final VoidCallback? onBrandClick;

  /// Accessible name of the logo link.
  final String brandLabel;

  /// Short product name after the logo, e.g. `lab`.
  final String? brandSuffix;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final t = I18n.of(context).t;
    final width = MediaQuery.maybeSizeOf(context)?.width ?? 1024;
    final tiny = width <= 340, narrow = width <= 600;
    final logo = workspaceHeaderLogoSize(width);
    final suffix = brandSuffix != null && !tiny;
    // `.lab-workspace-brand`: logo and suffix 6px apart, at least the group's control height.
    final brand = Link(
      href: brandHref,
      onClick: onBrandClick,
      ariaLabel: brandLabel,
      child: ConstrainedBox(
        constraints: BoxConstraints(
          minHeight: _toolbarItem(context, theme) - 6,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          spacing: 6,
          children: [
            FoAnimatedLogo(width: logo.width, height: logo.height),
            if (suffix)
              ExcludeSemantics(
                child: DefaultTextStyle.merge(
                  style: TextStyle(
                    fontSize: narrow ? 16 : 18,
                    height: 24 / (narrow ? 16 : 18),
                    fontWeight: FontWeight.w400,
                    color: c.muted,
                    leadingDistribution: TextLeadingDistribution.even,
                  ),
                  child: CssBaseline(
                    lineHeight: 24,
                    child: Text('/ $brandSuffix', maxLines: 1, softWrap: false),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
    final leading = ToolbarGroup(
      label: t('lab.nav.workspaceNavigation'),
      children: [
        toggle,
        brand,
        // padding-inline-end: 14px (10 / 8 on small screens), of which the group pads 2.
        SizedBox(width: tiny ? 6 : (narrow ? 8 : 12)),
      ],
    );
    final showContext = width > 900;
    final contextColumn = showContext
        ? Flexible(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              spacing: 2,
              children: [
                DefaultTextStyle.merge(
                  style: TextStyle(
                    fontSize: 14,
                    height: 20 / 14,
                    fontWeight: FontWeight.w500,
                    color: c.ink,
                    leadingDistribution: TextLeadingDistribution.even,
                  ),
                  child: CssBaseline(
                    lineHeight: 20,
                    child: Semantics(
                      header: true,
                      child: Text(
                        title,
                        maxLines: 1,
                        softWrap: false,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ),
                ),
                if (detail != null)
                  ConstrainedBox(
                    // max-width: 30ch (a Plex "0" is 0.6em wide at 12px).
                    constraints: const BoxConstraints(maxWidth: 30 * 7.2),
                    child: DefaultTextStyle.merge(
                      style: TextStyle(
                        fontSize: 12,
                        height: 16 / 12,
                        fontWeight: FontWeight.w400,
                        color: c.muted,
                        leadingDistribution: TextLeadingDistribution.even,
                      ),
                      child: CssBaseline(
                        lineHeight: 16,
                        child: Text(
                          detail!,
                          maxLines: 1,
                          softWrap: false,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          )
        : null;
    final trailing = (tools == null && actions == null)
        ? null
        : Row(
            mainAxisSize: MainAxisSize.min,
            // `.lab-toolbar-trailing`: --lab-toolbar-gap between the groups.
            spacing: theme.sizes.toolbarGap,
            children: [
              if (tools != null)
                ToolbarGroup(
                  label: toolsLabel ?? t('lab.nav.viewControls'),
                  children: tools!,
                ),
              if (actions != null)
                ToolbarGroup(
                  label: t('lab.nav.workspaceActions'),
                  children: actions!,
                ),
            ],
          );
    // A toolbar group is the toolbar item (at least 44px on touch).
    final groupHeight = _toolbarItem(context, theme);
    final toolbar = Toolbar(
      label: t('lab.nav.labWorkspace'),
      leading: Row(
        mainAxisSize: MainAxisSize.min,
        spacing: 16,
        children: [leading, ?contextColumn],
      ),
      trailing: trailing,
    );
    return DefaultTextStyle.merge(
      style: TextStyle(color: c.ink, fontFamily: kitFontFamily),
      child: Semantics(
        container: true,
        explicitChildNodes: true,
        // 46px tall; embedded headers are at least 54px, the toolbar centred.
        child: embedded
            ? Padding(
                padding: EdgeInsets.symmetric(
                  vertical: math.max(0, (54 - groupHeight) / 2),
                ),
                child: toolbar,
              )
            : SizedBox(height: 46, child: toolbar),
      ),
    );
  }
}

/// `ToolbarGroup`'s bubble height: the toolbar item, at least the touch target on touch screens.
double _toolbarItem(BuildContext context, ThemeData theme) {
  final s = theme.sizes;
  return theme.coarsePointer(context) && s.toolbarItem < s.touchTarget
      ? s.touchTarget
      : s.toolbarItem;
}
