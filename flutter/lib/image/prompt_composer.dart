import 'dart:math' as math;

import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import '../composer/composer.dart';
import '../i18n/i18n.dart';
import '../icons/lucide.dart';
import '../brand/geometry.dart' show SuperellipseBorder;
import '../menu/anchored_panel.dart';
import '../menu/menu_surface.dart';
import '../primitives/button.dart';
import '../theme.dart';
import '../theme/color_mix.dart';
import '../theme/tokens.dart' show MotionTokens;
import 'freeform_board.dart' show imageProviderFor;
import 'prompt_settings_panel.dart';

/// An attached reference image, shown as a thumbnail inside the composer.
@immutable
class ComposerReference {
  const ComposerReference({
    required this.id,
    required this.url,
    required this.name,
    this.preview,
  });
  final String id;

  /// Image URL (network, or a base64 `data:` URL) for the thumbnail.
  final String url;
  final String name;

  /// Draws the thumbnail instead of loading [url] (bytes the host holds, SVG art).
  final Widget? preview;
}

/// A prompt idea offered by the + menu.
@immutable
class ComposerTemplate {
  const ComposerTemplate({
    required this.id,
    required this.name,
    required this.prompt,
    this.description,
  });
  final String id, name, prompt;
  final String? description;
}

/// One of the user's earlier images, offered as a reference.
@immutable
class RecentImage {
  const RecentImage({
    required this.id,
    required this.thumbUrl,
    required this.prompt,
    this.preview,
  });
  final String id, thumbUrl, prompt;

  /// Draws the thumbnail instead of loading [thumbUrl].
  final Widget? preview;
}

/// A file from upload, paste or drop (the web kit's `File`): name, media type and bytes.
@immutable
class ComposerFile {
  const ComposerFile({
    required this.name,
    required this.type,
    required this.bytes,
  });
  final String name;

  /// Media type, such as `image/png`.
  final String type;
  final Uint8List bytes;
}

/// How many reference images the model takes, and in which formats.
@immutable
class ReferenceLimit {
  const ReferenceLimit({required this.max, required this.formats});
  final int max;
  final List<String> formats;
}

/// What the composer makes: one picture, or a tall landing-page poster from a brief.
enum ImageComposerMode { image, poster }

/// What the AI wand does: improve the prompt, or suggest ideas for an empty one.
enum EnhanceMode { enhance, ideas }

/// Opens the platform's file picker (the web kit's hidden `<input type=file>`).
typedef ComposerFilePicker = Future<List<ComposerFile>> Function({
  required bool multiple,
  required List<String> accept,
});

/// The image studio composer, built from the composer parts ([ComposerBar]): the twin of
/// `ImagePromptComposer` in `@feeef.dev/ui/image/prompt-composer`. A round + bubble with the add
/// menu, and a glass capsule holding the reference thumbnails (the first is marked "Main"), the
/// prompt and send. Empty and idle it is one calm line with the AI ideas button beside send; with
/// text or focus, a second row shows the model ladder and the output settings chip, and the AI
/// button turns into "Improve my prompt".
///
/// Flutter has no file input, clipboard images or file drops without plugins, so the host passes
/// [pickFiles] and [readClipboard] (menu entries stay disabled without them) and drives
/// [dropActive] from its own drop target.
class ImagePromptComposer extends StatefulWidget {
  const ImagePromptComposer({
    super.key,
    required this.prompt,
    required this.onPrompt,
    required this.placeholder,
    required this.maxLength,
    required this.references,
    required this.referenceLimit,
    required this.onAddFiles,
    required this.onRemoveReference,
    required this.recent,
    required this.onUseRecent,
    required this.onEditPhoto,
    required this.templates,
    this.templatesLabel,
    required this.onTemplate,
    required this.mode,
    this.templateName,
    this.onClearTemplate,
    this.onBrowseTemplates,
    required this.ladder,
    required this.settings,
    required this.settingsLabel,
    this.settingsDisabled = false,
    this.onSettings,
    this.settingsActive = false,
    this.referenceNoun,
    this.wandLabel,
    required this.enhancing,
    this.onEnhance,
    required this.onSubmit,
    required this.submitDisabled,
    required this.submitting,
    required this.submitLabel,
    this.onStop,
    this.stopLabel,
    required this.caption,
    this.above,
    this.onKeyEvent,
    this.pickFiles,
    this.readClipboard,
    this.dropActive = false,
    this.focusNode,
  });

  /// The prompt text (controlled).
  final String prompt;

  /// Called with the new text on every edit.
  final ValueChanged<String> onPrompt;

  /// Animated hint shown while the prompt is empty.
  final String placeholder;

  /// Maximum prompt length in characters.
  final int maxLength;

  /// Attached reference images, shown as thumbnails inside the capsule. The first is the main
  /// image.
  final List<ComposerReference> references;

  /// Null when the selected model takes no image input. `max` is shown as "1 of 3".
  final ReferenceLimit? referenceLimit;

  /// Called with files from upload or paste. The owner validates type and count.
  final ValueChanged<List<ComposerFile>> onAddFiles;

  /// Called when a reference's × badge is pressed.
  final ValueChanged<String> onRemoveReference;

  /// The user's earlier images for the "From your images" submenu (first 12). Empty hides it.
  final List<RecentImage> recent;

  /// Called with the id of a recent image picked as a reference.
  final ValueChanged<String> onUseRecent;

  /// Called with the photo chosen from "Edit a photo…".
  final ValueChanged<ComposerFile> onEditPhoto;

  /// Prompt ideas for the + menu (first 10). Empty hides the submenu.
  final List<ComposerTemplate> templates;

  /// Label of the ideas submenu. Defaults to the localized "Start from an idea".
  final String? templatesLabel;

  /// Called with the idea the user picked.
  final ValueChanged<ComposerTemplate> onTemplate;

  /// Image makes one picture; Poster builds a tall landing-page image from the brief.
  final ImageComposerMode mode;

  /// The poster template in use, shown as a wide tile before the references.
  final String? templateName;

  /// Shows the template tile's × badge.
  final VoidCallback? onClearTemplate;

  /// Replaces the template submenu with one entry that opens a full template browser.
  final VoidCallback? onBrowseTemplates;

  /// The model control on the second row, usually `ModelLadder(variant: .compact, …)`.
  final Widget ladder;

  /// Content of the output settings popover (shape, resolution, format).
  final Widget settings;

  /// Short summary of the current settings ("1:1"), shown on the settings chip.
  final String settingsLabel;

  /// Disables the settings chip and closes its popover.
  final bool settingsDisabled;

  /// When set, the settings chip toggles a panel the page owns instead of a popover.
  final VoidCallback? onSettings;

  /// Pressed state of the settings chip when [onSettings] is set.
  final bool settingsActive;

  /// What attached images are called in the + menu ("References", "Product photos").
  final String? referenceNoun;

  /// Overrides the AI button's label (posters suggest details instead of rewriting the prompt).
  final String? wandLabel;

  /// The AI request in flight, or null when idle. Shows a loader on the AI button.
  final EnhanceMode? enhancing;

  /// Improve the prompt, or suggest ideas when it is empty. Null hides the AI button.
  final ValueChanged<EnhanceMode>? onEnhance;

  /// Called by send and by Enter (Shift+Enter breaks the line).
  final VoidCallback onSubmit;

  /// Disables sending.
  final bool submitDisabled;

  /// A generation is being sent: send shows the loader.
  final bool submitting;

  /// Accessible name of send, such as "Create image".
  final String submitLabel;

  /// While submitting, send becomes a stop button that calls this.
  final VoidCallback? onStop;

  /// Accessible name of send while it stops. Defaults to the localized "Stop".
  final String? stopLabel;

  /// Small text under the composer, such as price or allowance.
  final Widget? caption;

  /// Suggestion cards shown right above the composer (AI proposals, conflicts).
  final Widget? above;

  /// Runs before the built-in Enter handling; return `handled` to skip it.
  final KeyEventResult Function(KeyEvent event)? onKeyEvent;

  /// Opens the platform file picker for "Upload images" and "Edit a photo…".
  final ComposerFilePicker? pickFiles;

  /// Reads images from the clipboard for "Paste from clipboard" (the web kit's `readClipboard`
  /// service).
  final Future<List<ComposerFile>> Function()? readClipboard;

  /// Highlights the capsule while the host's drop target carries compatible files.
  final bool dropActive;

  /// Focus of the prompt field.
  final FocusNode? focusNode;

  @override
  State<ImagePromptComposer> createState() => _ImagePromptComposerState();
}

class _ImagePromptComposerState extends State<ImagePromptComposer> {
  late final FocusNode _ownFocus = FocusNode(debugLabel: 'image prompt');
  FocusNode get _field => widget.focusNode ?? _ownFocus;
  bool _settingsOpen = false;
  bool _menuOpen = false;

  @override
  void didUpdateWidget(ImagePromptComposer oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.settingsDisabled && _settingsOpen) _settingsOpen = false;
  }

  @override
  void dispose() {
    _ownFocus.dispose();
    super.dispose();
  }

  bool get _canReference => widget.referenceLimit != null;
  bool get _full =>
      widget.referenceLimit != null &&
      widget.references.length >= widget.referenceLimit!.max;

  Future<void> _upload() async {
    final pick = widget.pickFiles;
    if (pick == null) return;
    final formats = widget.referenceLimit?.formats ?? const [];
    final files = await pick(
      multiple: true,
      accept: formats.isNotEmpty
          ? formats
          : const ['image/png', 'image/jpeg', 'image/webp'],
    );
    if (files.isNotEmpty) widget.onAddFiles(files);
  }

  Future<void> _editPhoto() async {
    final pick = widget.pickFiles;
    if (pick == null) return;
    final files = await pick(
      multiple: false,
      accept: const ['image/png', 'image/jpeg', 'image/webp'],
    );
    if (files.isNotEmpty) widget.onEditPhoto(files.first);
  }

  Future<void> _paste() async {
    final read = widget.readClipboard;
    if (read == null) return;
    try {
      final files = [
        for (final file in await read())
          if (file.type.startsWith('image/')) file,
      ];
      if (files.isNotEmpty) widget.onAddFiles(files);
    } catch (_) {
      _field.requestFocus();
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ThemeProvider.of(context).sizes;
    final t = I18n.of(context).t;
    final wandMode = widget.prompt.trim().isNotEmpty
        ? EnhanceMode.enhance
        : EnhanceMode.ideas;

    final wand = widget.onEnhance == null
        ? null
        : IconButton(
            variant: ButtonVariant.ghost,
            appearance: ButtonAppearance.toolbar,
            controlSize: ControlSize.small,
            ariaLabel:
                widget.wandLabel ??
                (wandMode == EnhanceMode.enhance
                    ? t('lab.imgcomposer.improvePrompt')
                    : t('lab.imgcomposer.suggestIdeas')),
            loading: widget.enhancing != null,
            onClick: () => widget.onEnhance?.call(wandMode),
            icon: LucideIcon(
              wandMode == EnhanceMode.enhance
                  ? LucideIcons.wandSparkles
                  : LucideIcons.lightbulb,
            ),
          );

    Widget chip({
      required String label,
      bool? pressed,
      required VoidCallback onClick,
    }) => Button(
      variant: ButtonVariant.ghost,
      appearance: ButtonAppearance.toolbar,
      controlSize: ControlSize.small,
      ariaLabel: label,
      pressed: pressed,
      disabled: widget.settingsDisabled,
      onClick: onClick,
      children: [
        const LucideIcon(LucideIcons.slidersHorizontal),
        Text(
          widget.settingsLabel,
          maxLines: 1,
          softWrap: false,
          overflow: TextOverflow.ellipsis,
        ),
      ],
    );

    final settingsControl = widget.onSettings != null
        ? chip(
            label: t('lab.imgcomposer.settingsWith', {
              'label': widget.settingsLabel,
            }),
            pressed: widget.settingsActive,
            onClick: widget.onSettings!,
          )
        : _Anchored(
            open: _settingsOpen && !widget.settingsDisabled,
            onClose: () => setState(() => _settingsOpen = false),
            label: t('lab.imgcomposer.outputSettings'),
            content: (context, maxHeight) => PromptSettingsPanel(
              maxHeight: maxHeight,
              onClose: () => setState(() => _settingsOpen = false),
              children: [widget.settings],
            ),
            trigger: chip(
              label: t('lab.imgcomposer.outputWith', {
                'label': widget.settingsLabel,
              }),
              onClick: () => setState(() => _settingsOpen = !_settingsOpen),
            ),
          );

    final add = _AddMenu(
      composer: widget,
      canReference: _canReference,
      full: _full,
      onOpenChange: (open) {
        if (open != _menuOpen) setState(() => _menuOpen = open);
      },
      trigger: (open, toggle) => IconButton(
        variant: ButtonVariant.ghost,
        appearance: ButtonAppearance.toolbar,
        ariaLabel: t('lab.imgcomposer.add'),
        onClick: toggle,
        icon: const LucideIcon(LucideIcons.plus),
      ),
      onUpload: _upload,
      onPaste: _paste,
      onEditPhoto: _editPhoto,
    );

    final hasAttachments =
        widget.references.isNotEmpty || widget.templateName != null;
    final attachments = !hasAttachments
        ? null
        : ComposerAttachments(
            label: t('lab.imgcomposer.referenceImages'),
            count: widget.references.length,
            max: widget.referenceLimit?.max,
            children: [
              if (widget.templateName != null)
                ComposerAttachment(
                  key: const ValueKey('template'),
                  id: 'template',
                  icon: const LucideIcon(LucideIcons.sparkle),
                  title: widget.templateName,
                  label: widget.templateName!,
                  onRemove: widget.onClearTemplate,
                  removeLabel: t('lab.imgcomposer.removeTemplate'),
                ),
              for (final (index, ref) in widget.references.indexed)
                ComposerAttachment(
                  key: ValueKey(ref.id),
                  id: ref.id,
                  label: ref.name,
                  badge: index == 0 ? t('lab.imgcomposer.main') : null,
                  onRemove: () => widget.onRemoveReference(ref.id),
                  preview:
                      ref.preview ??
                      (ref.url.isEmpty
                          ? null
                          : Image(
                              image: imageProviderFor(ref.url),
                              fit: BoxFit.cover,
                              excludeFromSemantics: true,
                              errorBuilder: (_, _, _) =>
                                  const SizedBox.shrink(),
                            )),
                ),
            ],
          );

    final bar = ComposerBar(
      leading: add,
      attachments: attachments,
      hasText: widget.prompt.isNotEmpty,
      pinned: _settingsOpen || _menuOpen || widget.settingsActive,
      dropActive: widget.dropActive,
      field: ComposerField(
        value: widget.prompt,
        onValueChange: widget.onPrompt,
        label: widget.mode == ImageComposerMode.poster
            ? t('lab.imgcomposer.describeProductOffer')
            : t('lab.imgcomposer.describeImage'),
        placeholder: widget.placeholder,
        maxLength: widget.maxLength,
        focusNode: _field,
        onKeyEvent: widget.onKeyEvent,
        onSubmit: () {
          if (!widget.submitDisabled && !widget.submitting) widget.onSubmit();
        },
      ),
      tools: [widget.ladder, settingsControl],
      actions: wand,
      send: ComposerSend(
        label: widget.submitLabel,
        ready: !widget.submitDisabled,
        submitting: widget.submitting,
        onSend: widget.onSubmit,
        onStop: widget.onStop,
        stopLabel: widget.stopLabel,
      ),
    );

    return Semantics(
      container: true,
      explicitChildNodes: true,
      label: widget.mode == ImageComposerMode.poster
          ? t('lab.imgcomposer.posterComposer')
          : t('lab.imgcomposer.composer'),
      child: Center(
        heightFactor: 1,
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 780),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: s.shellGap,
            children: [
              ?widget.above,
              bar,
              if (widget.caption != null)
                ComposerCaption(child: widget.caption!),
            ],
          ),
        ),
      ),
    );
  }
}

// Popovers and menus -------------------------------------------------------------------------

/// A Radix-style popover in an [AnchoredPanel]: [content] floats [offset] above [trigger] (start
/// or end aligned), flips and shifts to stay inside its bounds, closes on Escape or a tap outside.
/// A [menu] covers its trigger and grows out of it ([MenuSurface] does the motion); other
/// popovers fade up in.
class _Anchored extends StatefulWidget {
  const _Anchored({
    required this.open,
    required this.onClose,
    required this.trigger,
    required this.content,
    this.inlineSide = false,
    this.menu = false,
    this.offset = 8,
    this.label,
    this.group,
  });
  final bool open;
  final VoidCallback onClose;
  final Widget trigger;

  /// Builds the floating content with the height available on its side.
  final Widget Function(BuildContext context, double maxHeight) content;

  /// Opens beside the trigger, toward the inline end (a submenu), instead of above it.
  final bool inlineSide;

  /// The content is a [MenuSurface] that covers the trigger and morphs out of it.
  final bool menu;
  final double offset;
  final String? label;

  /// Tap region group shared with nested popovers, so a tap in a submenu keeps its menu open.
  final Object? group;

  @override
  State<_Anchored> createState() => _AnchoredState();
}

class _AnchoredState extends State<_Anchored>
    with SingleTickerProviderStateMixin {
  late final _pop = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 200),
  );

  Object get _group => widget.group ?? this;

  @override
  void initState() {
    super.initState();
    if (widget.open) _pop.value = 1;
  }

  @override
  void didUpdateWidget(_Anchored old) {
    super.didUpdateWidget(old);
    if (widget.open && !old.open) {
      if (reducedMotionOf(context)) {
        _pop.value = 1;
      } else {
        _pop.forward(from: 0);
      }
    }
  }

  @override
  void dispose() {
    _pop.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AnchoredPanel(
    open: widget.open,
    side: widget.inlineSide ? PanelSide.end : PanelSide.top,
    align: PanelAlign.start,
    sideOffset: widget.offset,
    cover: widget.menu && !widget.inlineSide,
    panel: _overlay,
    child: TapRegion(groupId: _group, child: widget.trigger),
  );

  Widget _overlay(BuildContext context) {
    final reduced = reducedMotionOf(context);
    Widget content = LayoutBuilder(
      builder: (context, constraints) =>
          widget.content(context, constraints.maxHeight),
    );
    if (!widget.menu) {
      content = AnimatedBuilder(
        animation: _pop,
        builder: (context, child) {
          final t = reduced ? 1.0 : MotionTokens.easeOut.transform(_pop.value);
          return Opacity(
            opacity: t,
            child: Transform(
              alignment: widget.inlineSide
                  ? Alignment.topCenter
                  : Alignment.bottomCenter,
              transform: Matrix4.translationValues(0, 4 * (1 - t), 0)
                ..scaleByDouble(0.97 + 0.03 * t, 0.97 + 0.03 * t, 1, 1),
              child: child,
            ),
          );
        },
        child: content,
      );
    }
    return TapRegion(
      groupId: _group,
      onTapOutside: (_) => widget.onClose(),
      child: Focus(
        onKeyEvent: (_, event) {
          if (event is KeyDownEvent &&
              event.logicalKey == LogicalKeyboardKey.escape) {
            widget.onClose();
            return KeyEventResult.handled;
          }
          return KeyEventResult.ignored;
        },
        child: Semantics(
          container: true,
          scopesRoute: true,
          explicitChildNodes: true,
          label: widget.label,
          child: content,
        ),
      ),
    );
  }
}

/// One `.lab-pc-menu-item`: the menu's row height (44 on touch) and padding, 13px text, a 15px
/// icon, primary tint when highlighted (hover or keyboard focus), 40% when disabled.
class _MenuItem extends StatefulWidget {
  const _MenuItem({
    required this.focusNode,
    required this.onSelect,
    required this.child,
    this.icon,
    this.disabled = false,
    this.submenu = false,
    this.open = false,
    this.onHover,
    this.padding,
    this.autoHeight = false,
    this.label,
  });
  final FocusNode focusNode;
  final VoidCallback onSelect;
  final Widget child;
  final LucideIconData? icon;
  final bool disabled, submenu, open, autoHeight;
  final VoidCallback? onHover;

  /// Null uses the menu's row padding.
  final EdgeInsets? padding;
  final String? label;

  @override
  State<_MenuItem> createState() => _MenuItemState();
}

class _MenuItemState extends State<_MenuItem> {
  bool _hover = false;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final tokens = MenuTokens.of(context);
    final highlighted =
        !widget.disabled &&
        (_hover || widget.focusNode.hasFocus || widget.open);
    final height = theme.coarsePointer(context)
        ? math.max(44.0, tokens.row)
        : tokens.row;
    return Semantics(
      button: true,
      enabled: !widget.disabled,
      expanded: widget.submenu ? widget.open : null,
      label: widget.label,
      child: FocusableActionDetector(
        focusNode: widget.focusNode,
        enabled: !widget.disabled,
        mouseCursor: widget.disabled
            ? SystemMouseCursors.basic
            : SystemMouseCursors.click,
        onShowHoverHighlight: (value) {
          setState(() => _hover = value);
          if (value && !widget.disabled) {
            widget.focusNode.requestFocus();
            widget.onHover?.call();
          }
        },
        onFocusChange: (_) => setState(() {}),
        actions: {
          ActivateIntent: CallbackAction<ActivateIntent>(
            onInvoke: (_) => widget.disabled ? null : widget.onSelect(),
          ),
        },
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: widget.disabled ? null : widget.onSelect,
          child: Opacity(
            opacity: widget.disabled ? 0.4 : 1,
            child: DecoratedBox(
              decoration: ShapeDecoration(
                color: highlighted
                    ? mixSrgb(c.primary, 0.16, transparent)
                    : transparent,
                shape: SuperellipseBorder(
                  radius: math.max(0, tokens.radiusIn(context) - tokens.inset),
                ),
              ),
              child: ConstrainedBox(
                constraints: BoxConstraints(
                  minHeight: widget.autoHeight ? 0 : height,
                ),
                child: Padding(
                  padding:
                      widget.padding ??
                      EdgeInsets.symmetric(horizontal: tokens.rowInline),
                  child: DefaultTextStyle.merge(
                    style: const TextStyle(fontSize: 13),
                    child: Row(
                      spacing: 9,
                      children: [
                        if (widget.icon != null)
                          LucideIcon(widget.icon!, size: 15, color: c.ink),
                        Expanded(child: widget.child),
                      ],
                    ),
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

/// Up/Down move between enabled items (wrapping), Home/End jump, Escape is the popover's.
class _MenuKeys extends StatelessWidget {
  const _MenuKeys({
    required this.nodes,
    required this.child,
    this.onOpenSub,
    this.onCloseSub,
  });
  final List<FocusNode> nodes;
  final Widget child;
  final bool Function(FocusNode focused)? onOpenSub;
  final VoidCallback? onCloseSub;

  @override
  Widget build(BuildContext context) {
    final rtl = Directionality.of(context) == TextDirection.rtl;
    return Focus(
      canRequestFocus: false,
      skipTraversal: true,
      onKeyEvent: (_, event) {
        if (event is! KeyDownEvent && event is! KeyRepeatEvent) {
          return KeyEventResult.ignored;
        }
        final enabled = nodes.where((n) => n.canRequestFocus).toList();
        if (enabled.isEmpty) return KeyEventResult.ignored;
        final current = enabled.indexWhere((n) => n.hasFocus);
        final key = event.logicalKey;
        int? next;
        if (key == LogicalKeyboardKey.arrowDown) {
          next = current < 0 ? 0 : (current + 1) % enabled.length;
        } else if (key == LogicalKeyboardKey.arrowUp) {
          next = current < 0
              ? enabled.length - 1
              : (current - 1 + enabled.length) % enabled.length;
        } else if (key == LogicalKeyboardKey.home) {
          next = 0;
        } else if (key == LogicalKeyboardKey.end) {
          next = enabled.length - 1;
        } else if (key ==
            (rtl
                ? LogicalKeyboardKey.arrowLeft
                : LogicalKeyboardKey.arrowRight)) {
          if (current >= 0 && (onOpenSub?.call(enabled[current]) ?? false)) {
            return KeyEventResult.handled;
          }
        } else if (key ==
            (rtl
                ? LogicalKeyboardKey.arrowRight
                : LogicalKeyboardKey.arrowLeft)) {
          if (onCloseSub != null) {
            onCloseSub!();
            return KeyEventResult.handled;
          }
        }
        if (next == null) return KeyEventResult.ignored;
        enabled[next].requestFocus();
        return KeyEventResult.handled;
      },
      child: child,
    );
  }
}

enum _Sub { none, recent, ideas }

/// The + menu: references (upload, paste), recent images, ideas or a template browser, and
/// "Edit a photo…". The first enabled item takes focus when it opens.
class _AddMenu extends StatefulWidget {
  const _AddMenu({
    required this.composer,
    required this.canReference,
    required this.full,
    required this.trigger,
    required this.onOpenChange,
    required this.onUpload,
    required this.onPaste,
    required this.onEditPhoto,
  });
  final ImagePromptComposer composer;
  final bool canReference, full;
  final Widget Function(bool open, VoidCallback toggle) trigger;

  /// Called when the menu opens or closes (it keeps the composer's second row in place).
  final ValueChanged<bool> onOpenChange;
  final Future<void> Function() onUpload, onPaste, onEditPhoto;

  @override
  State<_AddMenu> createState() => _AddMenuState();
}

class _AddMenuState extends State<_AddMenu> {
  bool _open = false;
  _Sub _sub = _Sub.none;
  final _upload = FocusNode(debugLabel: 'upload');
  final _paste = FocusNode(debugLabel: 'paste');
  final _recent = FocusNode(debugLabel: 'recent');
  final _ideas = FocusNode(debugLabel: 'ideas');
  final _edit = FocusNode(debugLabel: 'edit');
  final List<FocusNode> _subNodes = [];
  final _group = Object();

  @override
  void dispose() {
    for (final node in [
      _upload,
      _paste,
      _recent,
      _ideas,
      _edit,
      ..._subNodes,
    ]) {
      node.dispose();
    }
    super.dispose();
  }

  List<FocusNode> _subFocus(int count) {
    while (_subNodes.length < count) {
      _subNodes.add(FocusNode(debugLabel: 'sub ${_subNodes.length}'));
    }
    return _subNodes.sublist(0, count);
  }

  void _setOpen(bool open) {
    setState(() {
      _open = open;
      _sub = _Sub.none;
    });
    widget.onOpenChange(open);
    if (open) _focusSoon(() => [_upload, _paste, _recent, _ideas, _edit]);
  }

  /// Focuses the first enabled node once its popover is on screen (it opens after a frame).
  void _focusSoon(List<FocusNode> Function() nodes, [int tries = 4]) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      for (final node in nodes()) {
        if (node.context != null && node.canRequestFocus) {
          node.requestFocus();
          return;
        }
      }
      if (tries > 1) {
        _focusSoon(nodes, tries - 1);
        WidgetsBinding.instance.scheduleFrame();
      }
    });
  }

  void _select(void Function() action) {
    _setOpen(false);
    action();
  }

  void _openSub(_Sub sub) {
    setState(() => _sub = sub);
    _focusSoon(() => _subNodes);
  }

  void _closeSub() {
    final trigger = _sub == _Sub.recent ? _recent : _ideas;
    setState(() => _sub = _Sub.none);
    trigger.requestFocus();
  }

  @override
  Widget build(BuildContext context) {
    final composer = widget.composer;
    final t = I18n.of(context).t;
    final noun = composer.referenceNoun ?? t('lab.imgcomposer.references');
    final ideasLabel =
        composer.templatesLabel ?? t('lab.imgcomposer.startFromIdea');
    final blocked = !widget.canReference || widget.full;
    final picking = composer.pickFiles != null;
    return _Anchored(
      open: _open,
      onClose: () => _setOpen(false),
      group: _group,
      menu: true,
      trigger: widget.trigger(_open, () => _setOpen(!_open)),
      content: (context, maxHeight) {
        final c = ThemeProvider.of(context).colors;
        final nodes = [_upload, _paste, _recent, _ideas, _edit];
        Widget separator() => const MenuSeparator();
        final menu = MenuSurface(
          child: _MenuKeys(
            nodes: nodes,
            onOpenSub: (node) {
              if (node == _recent) _openSub(_Sub.recent);
              if (node == _ideas && composer.onBrowseTemplates == null) {
                _openSub(_Sub.ideas);
              }
              return node == _recent || node == _ideas;
            },
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(10, 6, 10, 4),
                  child: Text(
                    widget.canReference
                        ? t('lab.imgcomposer.upTo', {
                            'noun': noun,
                            'max': '${composer.referenceLimit!.max}',
                          })
                        : t('lab.imgcomposer.modelNoReference'),
                    style: TextStyle(fontSize: 11, color: c.muted),
                  ),
                ),
                _MenuItem(
                  focusNode: _upload,
                  icon: LucideIcons.upload,
                  disabled: blocked || !picking,
                  onSelect: () => _select(widget.onUpload),
                  child: Text(t('lab.imgcomposer.uploadImages')),
                ),
                _MenuItem(
                  focusNode: _paste,
                  icon: LucideIcons.clipboardPaste,
                  disabled: blocked || composer.readClipboard == null,
                  onSelect: () => _select(widget.onPaste),
                  child: Text(t('lab.imgcomposer.pasteClipboard')),
                ),
                separator(),
                if (composer.recent.isNotEmpty)
                  _subMenu(
                    context,
                    sub: _Sub.recent,
                    node: _recent,
                    icon: LucideIcons.history,
                    label: t('lab.imgcomposer.fromYourImages'),
                    disabled: blocked,
                    width: null,
                    items: (nodes) => _RecentGrid(
                      images: composer.recent.take(12).toList(),
                      nodes: nodes,
                      onPick: (id) => _select(() => composer.onUseRecent(id)),
                    ),
                    count: math.min(12, composer.recent.length),
                  ),
                if (composer.onBrowseTemplates != null)
                  _MenuItem(
                    focusNode: _ideas,
                    icon: LucideIcons.layoutTemplate,
                    onSelect: () => _select(composer.onBrowseTemplates!),
                    child: Text('$ideasLabel…'),
                  )
                else if (composer.templates.isNotEmpty)
                  _subMenu(
                    context,
                    sub: _Sub.ideas,
                    node: _ideas,
                    icon: LucideIcons.sparkle,
                    label: ideasLabel,
                    disabled: false,
                    width: 300,
                    count: math.min(10, composer.templates.length),
                    items: (nodes) => Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        for (final (i, template)
                            in composer.templates.take(10).indexed)
                          _MenuItem(
                            focusNode: nodes[i],
                            autoHeight: true,
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 8,
                            ),
                            label: template.name,
                            onSelect: () =>
                                _select(() => composer.onTemplate(template)),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              spacing: 2,
                              children: [
                                Text(
                                  template.name,
                                  style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                                Text(
                                  template.description?.isNotEmpty == true
                                      ? template.description!
                                      : template.prompt,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: c.muted,
                                  ),
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),
                  ),
                separator(),
                _MenuItem(
                  focusNode: _edit,
                  icon: LucideIcons.brush,
                  disabled: !picking,
                  onSelect: () => _select(widget.onEditPhoto),
                  child: Text(t('lab.imgcomposer.editPhoto')),
                ),
              ],
            ),
          ),
        );
        return menu;
      },
    );
  }

  Widget _subMenu(
    BuildContext context, {
    required _Sub sub,
    required FocusNode node,
    required LucideIconData icon,
    required String label,
    required bool disabled,
    required double? width,
    required int count,
    required Widget Function(List<FocusNode> nodes) items,
  }) {
    final open = _sub == sub;
    final nodes = _subFocus(count);
    final rtl = Directionality.of(context) == TextDirection.rtl;
    return _Anchored(
      open: open,
      inlineSide: true,
      menu: true,
      offset: 4,
      group: _group,
      onClose: () => _setOpen(false),
      trigger: _MenuItem(
        focusNode: node,
        icon: icon,
        disabled: disabled,
        submenu: true,
        open: open,
        onHover: () {
          if (_sub != sub) setState(() => _sub = sub);
        },
        onSelect: () => _openSub(sub),
        child: Row(
          children: [
            Expanded(child: Text(label)),
            LucideIcon(
              rtl ? LucideIcons.chevronLeft : LucideIcons.chevronRight,
              size: 15,
            ),
          ],
        ),
      ),
      content: (context, maxHeight) {
        final menu = MenuSurface(
          child: _MenuKeys(
            nodes: nodes,
            onCloseSub: _closeSub,
            child: items(nodes),
          ),
        );
        return width == null ? menu : SizedBox(width: width, child: menu);
      },
    );
  }
}

/// `.lab-pc-recent`: four 56px thumbnails per row; the highlighted one gets a primary border.
class _RecentGrid extends StatelessWidget {
  const _RecentGrid({
    required this.images,
    required this.nodes,
    required this.onPick,
  });
  final List<RecentImage> images;
  final List<FocusNode> nodes;
  final ValueChanged<String> onPick;

  @override
  Widget build(BuildContext context) {
    final t = I18n.of(context).t;
    return SizedBox(
      width: 56 * 4 + 6 * 3,
      child: Wrap(
        spacing: 6,
        runSpacing: 6,
        children: [
          for (final (i, image) in images.indexed)
            _RecentItem(
              image: image,
              node: nodes[i],
              label: image.prompt.isNotEmpty
                  ? image.prompt
                  : t('lab.imgcomposer.generatedImage'),
              onPick: () => onPick(image.id),
            ),
        ],
      ),
    );
  }
}

class _RecentItem extends StatefulWidget {
  const _RecentItem({
    required this.image,
    required this.node,
    required this.label,
    required this.onPick,
  });
  final RecentImage image;
  final FocusNode node;
  final String label;
  final VoidCallback onPick;

  @override
  State<_RecentItem> createState() => _RecentItemState();
}

class _RecentItemState extends State<_RecentItem> {
  bool _hover = false;

  @override
  Widget build(BuildContext context) {
    final c = ThemeProvider.of(context).colors;
    final highlighted = _hover || widget.node.hasFocus;
    return Semantics(
      button: true,
      label: widget.label,
      child: FocusableActionDetector(
        focusNode: widget.node,
        mouseCursor: SystemMouseCursors.click,
        onShowHoverHighlight: (value) {
          setState(() => _hover = value);
          if (value) widget.node.requestFocus();
        },
        onFocusChange: (_) => setState(() {}),
        actions: {
          ActivateIntent: CallbackAction<ActivateIntent>(
            onInvoke: (_) => widget.onPick(),
          ),
        },
        child: GestureDetector(
          onTap: widget.onPick,
          child: Container(
            width: 56,
            height: 56,
            clipBehavior: Clip.antiAlias,
            decoration: ShapeDecoration(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
                side: BorderSide(
                  width: 2,
                  color: highlighted ? c.primary : transparent,
                ),
              ),
            ),
            child:
                widget.image.preview ??
                Image(
                  image: imageProviderFor(widget.image.thumbUrl),
                  fit: BoxFit.cover,
                  excludeFromSemantics: true,
                  errorBuilder: (_, _, _) => const SizedBox.shrink(),
                ),
          ),
        ),
      ),
    );
  }
}
