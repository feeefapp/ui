import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import '../icons/lucide.dart';
import '../primitives/button.dart';
import '../menu/anchored_panel.dart';
import '../menu/menu_surface.dart';
import '../primitives/select.dart';
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
  final _trigger = FocusNode(debugLabel: 'Language');
  bool _open = false;

  @override
  void dispose() {
    _trigger.dispose();
    super.dispose();
  }

  void _toggle() => setState(() => _open = !_open);

  void _close() {
    if (!_open) return;
    setState(() => _open = false);
    _trigger.requestFocus();
  }

  @override
  Widget build(BuildContext context) {
    final i18n = widget.i18n;
    // A toolbar trigger: the menu covers it and lines up with its edge (MenuSurface).
    return AnchoredPanel(
      open: _open,
      onDismiss: _close,
      cover: true,
      align: null,
      panel: (context) => _LanguageMenu(
        label: i18n.t('lab.common.language'),
        languages: widget.languages,
        selected: i18n.locale,
        choose: (code) {
          _close();
          i18n.setLocale(code);
        },
        close: _close,
      ),
      child: Semantics(
        expanded: _open,
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
      child: MenuSurface(
        label: widget.label,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [for (var i = 0; i < n; i++) _row(i)],
        ),
      ),
    );
  }

  Widget _row(int i) {
    final language = widget.languages[i];
    final selected = language.code == widget.selected;
    return Semantics(
      checked: selected,
      inMutuallyExclusiveGroup: true,
      button: true,
      onTap: () => widget.choose(language.code),
      child: MenuRow(
        leading: selected
            ? const LucideCheck(size: 16)
            : const SizedBox.shrink(),
        label: _LanguageName(language),
        highlighted: i == _highlight,
        onHover: () => setState(() => _highlight = i),
        onTap: () => widget.choose(language.code),
      ),
    );
  }
}
