/// Semantic layout helpers, the twin of `@feeef.dev/ui/primitives/layout`. On the web these are thin
/// wrappers over HTML elements; here they carry the same meaning to assistive technology.
///
/// `Text` and `Form` are Flutter's own widgets of the same names, `List` / `ListItem` are the kit's
/// `ListSection` / `ListRow` (a Dart class named `List` would shadow `dart:core`), and `Style`
/// (a `<style>` tag) has no meaning in Flutter. This library is not part of `feeef_ui.dart`;
/// import it by path.
library;

import 'package:flutter/rendering.dart';
import 'package:flutter/widgets.dart';

import '../theme.dart';

/// The element a [Box] stands for: its landmark role.
enum BoxElement {
  div,
  header,
  nav,
  main,
  aside,
  section,
  article,
  footer,
  span,
}

/// A plain container with an element's meaning: `nav` is a navigation landmark, `main` the main
/// content, `aside` complementary, `footer` content info, `section` a region (when labelled).
/// The twin of `Box`.
class Box extends StatelessWidget {
  const Box({
    super.key,
    this.as = BoxElement.div,
    this.label,
    required this.child,
  });

  /// Which element it stands for (default `div`, no role).
  final BoxElement as;

  /// Accessible name (`aria-label`).
  final String? label;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final role = switch (as) {
      BoxElement.nav => SemanticsRole.navigation,
      BoxElement.main => SemanticsRole.main,
      BoxElement.aside => SemanticsRole.complementary,
      BoxElement.footer => SemanticsRole.contentInfo,
      BoxElement.section when label != null => SemanticsRole.region,
      _ => null,
    };
    if (role == null && label == null) return child;
    return Semantics(
      container: true,
      explicitChildNodes: true,
      role: role,
      label: label,
      child: child,
    );
  }
}

/// A link: announced as a link to [href], focusable, activated by tap, Enter or Space. The twin of
/// `Link` (`<a href>`). Flutter has no browser navigation: route in [onClick].
class Link extends StatefulWidget {
  const Link({
    super.key,
    this.href,
    this.onClick,
    this.ariaLabel,
    this.focusNode,
    required this.child,
  });

  /// Destination, announced to assistive technology.
  final String? href;

  /// Called on activation.
  final VoidCallback? onClick;

  /// Accessible name, replacing the child's text.
  final String? ariaLabel;
  final FocusNode? focusNode;
  final Widget child;

  @override
  State<Link> createState() => _LinkState();
}

class _LinkState extends State<Link> {
  bool _focused = false;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final enabled = widget.onClick != null;
    Widget body = widget.child;
    if (widget.ariaLabel != null) body = ExcludeSemantics(child: body);
    return Semantics(
      link: true,
      linkUrl: widget.href == null ? null : Uri.tryParse(widget.href!),
      label: widget.ariaLabel,
      onTap: widget.onClick,
      child: FocusableActionDetector(
        enabled: enabled,
        focusNode: widget.focusNode,
        mouseCursor: enabled ? SystemMouseCursors.click : MouseCursor.defer,
        onShowFocusHighlight: (value) => setState(() => _focused = value),
        actions: {
          ActivateIntent: CallbackAction<ActivateIntent>(
            onInvoke: (_) {
              widget.onClick?.call();
              return null;
            },
          ),
        },
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: widget.onClick,
          child: DecoratedBox(
            // :focus-visible ring: 2px of the focus colour.
            position: DecorationPosition.foreground,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(theme.sizes.radiusSmall / 2),
              border: _focused
                  ? Border.all(color: theme.colors.focus, width: 2)
                  : null,
            ),
            child: body,
          ),
        ),
      ),
    );
  }
}

/// A horizontal rule (`<hr>`): a 1px line in the kit's line colour with half a line of space
/// above and below. A bare web `<hr>` gets the browser's 2px inset rule instead.
class Divider extends StatelessWidget {
  const Divider({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final font = DefaultTextStyle.of(context).style.fontSize ?? 16;
    return Padding(
      padding: EdgeInsets.symmetric(vertical: font / 2),
      child: SizedBox(
        width: double.infinity,
        height: 1,
        child: ColoredBox(color: theme.colors.line),
      ),
    );
  }
}
