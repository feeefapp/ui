import 'dart:math' as math;

import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import '../glass/container.dart';
import '../icons/lucide.dart';
import '../primitives/button.dart';
import '../primitives/popover_surface.dart';
import '../primitives/select.dart';
import '../theme.dart';
import '../theme/css_text.dart';
import 'i18n.dart';
import 'i18n_core.dart';

/// Language picker: the twin of `LanguageSwitcher` in `@feeef.dev/ui/i18n`. A labelled [Select]
/// with a globe, or with [iconOnly] a globe icon button opening a menu of languages above it. Each
/// name is written in its own language and direction. Choosing calls `I18n.setLocale` (the
/// provider's `onLocaleChange`). Renders nothing when fewer than two locales are available.
class LanguageSwitcher extends StatelessWidget {
  const LanguageSwitcher({super.key, this.iconOnly = false});

  /// Show a globe icon button with a menu instead of the labelled select.
  final bool iconOnly;

  @override
  Widget build(BuildContext context) {
    final i18n = I18n.of(context);
    final visible = [
      for (final l in languages)
        if (i18n.availableLocales.contains(l.code)) l,
    ];
    if (visible.length < 2) return const SizedBox.shrink();
    if (iconOnly) return _LanguageMenuButton(languages: visible, i18n: i18n);
    return Row(
      mainAxisSize: MainAxisSize.min,
      spacing: 6,
      children: [
        const ExcludeSemantics(child: LucideGlobe(size: 16)),
        Select(
          hint: i18n.t('lab.common.language'),
          ariaLabel: i18n.t('lab.common.language'),
          value: i18n.locale,
          onValueChange: i18n.setLocale,
          children: [
            for (final l in visible)
              Option(value: l.code, child: _LanguageName(l)),
          ],
        ),
      ],
    );
  }
}

class _LanguageName extends StatelessWidget {
  const _LanguageName(this.language);
  final Language language;
  @override
  Widget build(BuildContext context) => Directionality(
    textDirection: language.direction,
    child: Text(language.name, maxLines: 1, softWrap: false),
  );
}

class _LanguageMenuButton extends StatefulWidget {
  const _LanguageMenuButton({required this.languages, required this.i18n});
  final List<Language> languages;
  final I18n i18n;

  @override
  State<_LanguageMenuButton> createState() => _LanguageMenuButtonState();
}

class _LanguageMenuButtonState extends State<_LanguageMenuButton> {
  final _portal = OverlayPortalController();
  final _link = LayerLink();
  final _trigger = FocusNode(debugLabel: 'Language');

  @override
  void dispose() {
    _trigger.dispose();
    super.dispose();
  }

  void _toggle() {
    setState(() => _portal.isShowing ? _portal.hide() : _portal.show());
  }

  void _close() {
    if (!_portal.isShowing) return;
    setState(_portal.hide);
    _trigger.requestFocus();
  }

  @override
  Widget build(BuildContext context) {
    final i18n = widget.i18n;
    final dir = Directionality.of(context);
    return CompositedTransformTarget(
      link: _link,
      child: OverlayPortal(
        controller: _portal,
        overlayChildBuilder: (context) => GlassLayer(
          child: Stack(
            children: [
              Positioned.fill(
                child: GestureDetector(
                  behavior: HitTestBehavior.translucent,
                  onTap: _close,
                ),
              ),
              // side="top" align="end" sideOffset={8}
              CompositedTransformFollower(
                link: _link,
                targetAnchor: AlignmentDirectional.topEnd.resolve(dir),
                followerAnchor: AlignmentDirectional.bottomEnd.resolve(dir),
                offset: const Offset(0, -8),
                child: Directionality(
                  textDirection: dir,
                  child: _LanguageMenu(
                    label: i18n.t('lab.common.language'),
                    languages: widget.languages,
                    selected: i18n.locale,
                    choose: (code) {
                      _close();
                      i18n.setLocale(code);
                    },
                    close: _close,
                  ),
                ),
              ),
            ],
          ),
        ),
        child: Semantics(
          expanded: _portal.isShowing,
          child: IconButton(
            variant: ButtonVariant.ghost,
            appearance: ButtonAppearance.toolbar,
            controlSize: ControlSize.icon,
            ariaLabel: i18n.t('lab.common.language'),
            focusNode: _trigger,
            onClick: _toggle,
            icon: const LucideGlobe(size: 20),
          ),
        ),
      ),
    );
  }
}

/// `.lab-actions-menu` with a radio group of languages.
class _LanguageMenu extends StatefulWidget {
  const _LanguageMenu({
    required this.label,
    required this.languages,
    required this.selected,
    required this.choose,
    required this.close,
  });
  final String label;
  final List<Language> languages;
  final String selected;
  final ValueChanged<String> choose;
  final VoidCallback close;

  @override
  State<_LanguageMenu> createState() => _LanguageMenuState();
}

class _LanguageMenuState extends State<_LanguageMenu> {
  late int _highlight = widget.languages.indexWhere(
    (l) => l.code == widget.selected,
  );
  final _scope = FocusScopeNode(debugLabel: 'Language menu');

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _scope.requestFocus();
    });
  }

  @override
  void dispose() {
    _scope.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final s = theme.sizes;
    final screen = MediaQuery.sizeOf(context).width;
    final space1 = s.density == Density.thin ? 2.0 : 4.0;
    final n = widget.languages.length;
    return FocusScope(
      node: _scope,
      onKeyEvent: (_, event) {
        if (event is! KeyDownEvent && event is! KeyRepeatEvent) {
          return KeyEventResult.ignored;
        }
        final key = event.logicalKey;
        if (key == LogicalKeyboardKey.escape) {
          widget.close();
        } else if (key == LogicalKeyboardKey.arrowDown) {
          setState(() => _highlight = (_highlight + 1) % n);
        } else if (key == LogicalKeyboardKey.arrowUp) {
          setState(() => _highlight = (_highlight - 1 + n) % n);
        } else if ((key == LogicalKeyboardKey.enter ||
                key == LogicalKeyboardKey.space) &&
            _highlight >= 0) {
          widget.choose(widget.languages[_highlight].code);
        } else {
          return KeyEventResult.ignored;
        }
        return KeyEventResult.handled;
      },
      child: Semantics(
        container: true,
        explicitChildNodes: true,
        scopesRoute: false,
        label: widget.label,
        child: ConstrainedBox(
          constraints: BoxConstraints(
            minWidth: math.min(200, screen - 24),
            maxWidth: math.min(360, screen - 24),
          ),
          child: IntrinsicWidth(
            child: PopoverSurface(
              padding: EdgeInsets.all(space1),
              child: DefaultTextStyle.merge(
                style: TextStyle(
                  fontSize: 14,
                  height: 20 / 14,
                  color: c.ink,
                  leadingDistribution: TextLeadingDistribution.even,
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    for (var i = 0; i < n; i++)
                      _row(context, i, s.radiusGroup - space1 - 1),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _row(BuildContext context, int i, double radius) {
    final theme = ThemeProvider.of(context);
    final language = widget.languages[i];
    final selected = language.code == widget.selected;
    return Semantics(
      checked: selected,
      inMutuallyExclusiveGroup: true,
      button: true,
      onTap: () => widget.choose(language.code),
      child: MouseRegion(
        onEnter: (_) => setState(() => _highlight = i),
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: () => widget.choose(language.code),
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: i == _highlight
                  ? theme.colors.surfaceSoft
                  : const Color(0x00000000),
              borderRadius: BorderRadius.circular(radius),
            ),
            child: ConstrainedBox(
              constraints: BoxConstraints(
                minHeight: theme.coarsePointer(context)
                    ? 44
                    : theme.sizes.controlCompact,
              ),
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 8,
                ),
                child: Row(
                  spacing: 8,
                  children: [
                    SizedBox.square(
                      dimension: 18,
                      child: selected
                          ? const LucideCheck(size: 16)
                          : const SizedBox.shrink(),
                    ),
                    Expanded(
                      child: CssBaseline(
                        lineHeight: 20,
                        child: _LanguageName(language),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
