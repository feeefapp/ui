import 'dart:math' as math;

import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import '../composer/composer.dart';
import '../i18n/i18n.dart';
import '../icons/lucide.dart';
import '../brand/geometry.dart' show SuperellipseBorder;
import '../menu/anchored_panel.dart';
import '../menu/menu_surface.dart';
import '../model_ladder.dart' show ModelLadderVariant;
import '../primitives/button.dart';
import '../theme.dart';
import '../theme/color_mix.dart';
import '../theme/css_text.dart';
import '../theme/tokens.dart' show MotionTokens;
import 'freeform_board.dart' show imageProviderFor;
import 'prompt_settings_panel.dart';

/// An attached reference image, shown as a chip above the card.
@immutable
class ComposerReference {
  const ComposerReference({
    required this.id,
    required this.url,
    required this.name,
    this.preview,
  });
  final String id;

  /// Image URL (network, or a base64 `data:` URL) for the 28px thumbnail.
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

/// The image studio composer, after marchant `image_gen_view` `_buildComposer`: the twin of
/// `ImagePromptComposer` in `@feeef.dev/ui/image/prompt-composer`. An attachment row above a
/// glass card that is one compact line until you type, then grows upward with its controls on a
/// second row. Model ladder, AI enhance, output settings and send are icon controls.
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

  /// Attached reference images, shown as chips above the card. The first is the main image.
  final List<ComposerReference> references;

  /// Null when the selected model takes no image input.
  final ReferenceLimit? referenceLimit;

  /// Called with files from upload or paste. The owner validates type and count.
  final ValueChanged<List<ComposerFile>> onAddFiles;

  /// Called when a reference chip is removed.
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

  /// The poster template in use, shown as a chip above the card.
  final String? templateName;
  final VoidCallback? onClearTemplate;

  /// Replaces the template submenu with one entry that opens a full template browser.
  final VoidCallback? onBrowseTemplates;

  /// Renders the model control for a slot, usually a ModelLadder with that variant.
  final Widget Function(ModelLadderVariant variant) ladder;

  /// Content of the output settings popover (shape, resolution, format).
  final Widget settings;

  /// Short summary of the current settings, used in the settings button's label.
  final String settingsLabel;

  /// Disables the settings button and closes its popover.
  final bool settingsDisabled;

  /// When set, the settings button toggles a panel the page owns instead of a popover.
  final VoidCallback? onSettings;

  /// Pressed state of the settings button when [onSettings] is set.
  final bool settingsActive;

  /// What attached images are called in the + menu ("References", "Product photos").
  final String? referenceNoun;

  /// Overrides the wand's label (posters suggest details instead of rewriting the prompt).
  final String? wandLabel;

  /// The AI wand request in flight, or null when idle. Shows a loader on the wand.
  final EnhanceMode? enhancing;

  /// Improve the prompt, or suggest ideas when it is empty. Null hides the wand.
  final ValueChanged<EnhanceMode>? onEnhance;

  /// Called by the send button and by Enter (Shift+Enter breaks the line).
  final VoidCallback onSubmit;

  /// Disables sending.
  final bool submitDisabled;

  /// A generation is being sent: the send button shows a loader and is disabled.
  final bool submitting;

  /// Accessible name of the send button, such as "Create image".
  final String submitLabel;

  /// Small text under the card, such as price or allowance. Shown while the composer has focus.
  final Widget caption;

  /// Suggestion cards shown right above the card (AI proposals, conflicts).
  final Widget? above;

  /// Runs before the built-in Enter handling; return `handled` to skip it.
  final KeyEventResult Function(KeyEvent event)? onKeyEvent;

  /// Opens the platform file picker for "Upload images" and "Edit a photo…".
  final ComposerFilePicker? pickFiles;

  /// Reads images from the clipboard for "Paste from clipboard" (the web kit's `readClipboard`
  /// service).
  final Future<List<ComposerFile>> Function()? readClipboard;

  /// Highlights the card while the host's drop target carries compatible files.
  final bool dropActive;

  /// Focus of the prompt field.
  final FocusNode? focusNode;

  @override
  State<ImagePromptComposer> createState() => _ImagePromptComposerState();
}

class _ImagePromptComposerState extends State<ImagePromptComposer> {
  late final FocusNode _ownFocus = FocusNode(debugLabel: 'image prompt');
  FocusNode get _field => widget.focusNode ?? _ownFocus;
  bool _focusedWithin = false;
  bool _fieldFocused = false;
  bool _settingsOpen = false;
  bool _expanded = false;

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

  KeyEventResult _key(KeyEvent event, TextEditingValue value) {
    final own = widget.onKeyEvent?.call(event);
    if (own == KeyEventResult.handled) return own!;
    // Enter sends, Shift+Enter breaks the line, like a chat.
    return composerEnterKey(event, value, () {
      if (!widget.submitDisabled && !widget.submitting) widget.onSubmit();
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final s = theme.sizes;
    final t = I18n.of(context).t;
    final m = ComposerInput.metrics(s);
    // `--pc-action-radius: calc(26px * scale - 6px)`; icon controls are 40px in every density.
    final actionRadius = math.max(0.0, 26 * s.radiusScale - 6);
    final wandMode = widget.prompt.trim().isNotEmpty
        ? EnhanceMode.enhance
        : EnhanceMode.ideas;

    Widget icons(Widget child) =>
        ControlOverrides(height: 40, radius: actionRadius, child: child);

    final wand = widget.onEnhance == null
        ? const SizedBox.shrink()
        : icons(
            IconButton(
              variant: ButtonVariant.ghost,
              appearance: ButtonAppearance.toolbar,
              ariaLabel:
                  widget.wandLabel ??
                  (wandMode == EnhanceMode.enhance
                      ? t('lab.imgcomposer.improvePrompt')
                      : t('lab.imgcomposer.suggestIdeas')),
              disabled: widget.enhancing != null,
              loading: widget.enhancing != null,
              onClick: () => widget.onEnhance?.call(wandMode),
              icon: LucideIcon(
                wandMode == EnhanceMode.enhance
                    ? LucideIcons.wandSparkles
                    : LucideIcons.lightbulb,
              ),
            ),
          );

    final settingsButton = widget.onSettings != null
        ? icons(
            IconButton(
              variant: ButtonVariant.ghost,
              appearance: ButtonAppearance.toolbar,
              ariaLabel: t('lab.imgcomposer.settingsWith', {
                'label': widget.settingsLabel,
              }),
              pressed: widget.settingsActive,
              disabled: widget.settingsDisabled,
              onClick: widget.onSettings,
              icon: const LucideIcon(LucideIcons.slidersHorizontal),
            ),
          )
        : _Anchored(
            open: _settingsOpen && !widget.settingsDisabled,
            onClose: () => setState(() => _settingsOpen = false),
            alignEnd: true,
            label: t('lab.imgcomposer.outputSettings'),
            content: (context, maxHeight) => PromptSettingsPanel(
              maxHeight: maxHeight,
              onClose: () => setState(() => _settingsOpen = false),
              children: [widget.settings],
            ),
            trigger: icons(
              IconButton(
                variant: ButtonVariant.ghost,
                appearance: ButtonAppearance.toolbar,
                ariaLabel: t('lab.imgcomposer.outputWith', {
                  'label': widget.settingsLabel,
                }),
                pressed: _settingsOpen ? true : null,
                disabled: widget.settingsDisabled,
                onClick: () => setState(() => _settingsOpen = !_settingsOpen),
                icon: const LucideIcon(LucideIcons.slidersHorizontal),
              ),
            ),
          );

    final send = icons(
      IconButton(
        variant: ButtonVariant.filled,
        ariaLabel: widget.submitLabel,
        disabled: widget.submitDisabled || widget.submitting,
        loading: widget.submitting,
        onClick: widget.onSubmit,
        icon: const LucideIcon(LucideIcons.arrowUp, strokeWidth: 2),
      ),
    );

    final add = _AddMenu(
      composer: widget,
      canReference: _canReference,
      full: _full,
      trigger: (open, toggle) => icons(
        IconButton(
          variant: ButtonVariant.ghost,
          appearance: ButtonAppearance.toolbar,
          ariaLabel: t('lab.imgcomposer.add'),
          pressed: open ? true : null,
          onClick: toggle,
          icon: const LucideIcon(LucideIcons.plus),
        ),
      ),
      onUpload: _upload,
      onPaste: _paste,
      onEditPhoto: _editPhoto,
    );

    final input = ComposerInput(
      value: widget.prompt,
      onValueChange: widget.onPrompt,
      label: widget.mode == ImageComposerMode.poster
          ? t('lab.imgcomposer.describeProductOffer')
          : t('lab.imgcomposer.describeImage'),
      placeholder: widget.placeholder,
      maxLength: widget.maxLength,
      focusNode: _field,
      onKeyEvent: _key,
      onFocusChange: (value) => setState(() => _fieldFocused = value),
    );

    final card = ComposerCard(
      expanded: _expanded,
      focused: _fieldFocused ? true : null,
      dropActive: widget.dropActive,
      shellInset: 6,
      child: ComposerLayout(
        prompt: widget.prompt,
        textStyle: ComposerInput.textStyle.copyWith(
          fontFamily: DefaultTextStyle.of(context).style.fontFamily,
          fontFamilyFallback: DefaultTextStyle.of(context)
              .style
              .fontFamilyFallback,
        ),
        fieldPadding: m.padInline * 2,
        fieldMinHeight: m.minHeight,
        gap: s.density == Density.thin ? 2 : 4,
        onExpandedChange: (value) {
          if (mounted && value != _expanded) setState(() => _expanded = value);
        },
        children: [
          ComposerSlot(
            compact: ComposerSlotSide.start,
            expanded: ComposerSlotSide.start,
            child: add,
          ),
          ComposerSlot(
            compact: ComposerSlotSide.start,
            expanded: ComposerSlotSide.start,
            child: widget.ladder(ModelLadderVariant.icon),
          ),
          input,
          ComposerSlot(
            compact: ComposerSlotSide.end,
            expanded: ComposerSlotSide.start,
            child: settingsButton,
          ),
          ComposerSlot(child: wand),
          ComposerSlot(child: send),
        ],
      ),
    );

    final attachments =
        widget.references.isNotEmpty || widget.templateName != null;
    final caption = AnimatedOpacity(
      // Unfocused: one quiet line, no caption.
      opacity: _focusedWithin ? 1 : 0,
      duration: const Duration(milliseconds: 200),
      child: DefaultTextStyle.merge(
        textAlign: TextAlign.center,
        style: TextStyle(
          fontSize: 11.5,
          height: 16 / 11.5,
          color: mixSrgb(c.muted, 0.82, transparent),
        ),
        child: CssBaseline(lineHeight: 16, child: widget.caption),
      ),
    );

    return Semantics(
      container: true,
      explicitChildNodes: true,
      label: widget.mode == ImageComposerMode.poster
          ? t('lab.imgcomposer.posterComposer')
          : t('lab.imgcomposer.composer'),
      child: Focus(
        canRequestFocus: false,
        skipTraversal: true,
        onFocusChange: (value) => setState(() => _focusedWithin = value),
        child: Center(
          heightFactor: 1,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 780),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              spacing: 8,
              children: [
                if (attachments)
                  _Attachments(
                    references: widget.references,
                    templateName: widget.templateName,
                    onClearTemplate: widget.onClearTemplate,
                    onRemoveReference: widget.onRemoveReference,
                  ),
                ?widget.above,
                card,
                caption,
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// Attachment row -----------------------------------------------------------------------------

/// `.lab-pc-attachments`: the poster template chip and the reference strip.
class _Attachments extends StatelessWidget {
  const _Attachments({
    required this.references,
    required this.templateName,
    required this.onClearTemplate,
    required this.onRemoveReference,
  });
  final List<ComposerReference> references;
  final String? templateName;
  final VoidCallback? onClearTemplate;
  final ValueChanged<String> onRemoveReference;

  @override
  Widget build(BuildContext context) {
    final c = ThemeProvider.of(context).colors;
    final t = I18n.of(context).t;
    final s = ThemeProvider.of(context).sizes;
    Widget remove(String label, VoidCallback onClick) => ControlOverrides(
      height: 40,
      radius: 14 * s.radiusScale,
      child: IconButton(
        variant: ButtonVariant.ghost,
        appearance: ButtonAppearance.toolbar,
        ariaLabel: label,
        onClick: onClick,
        icon: LucideIcon(LucideIcons.x, color: c.muted),
      ),
    );
    return ConstrainedBox(
      constraints: const BoxConstraints(minHeight: 40),
      child: Row(
        spacing: 6,
        children: [
          if (templateName != null)
            DecoratedBox(
              decoration: ShapeDecoration(
                color: mixSrgb(c.primary, 0.14, transparent),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(18),
                  side: BorderSide(color: mixSrgb(c.primary, 0.45, c.line)),
                ),
              ),
              child: ConstrainedBox(
                constraints: const BoxConstraints(minHeight: 46),
                child: Padding(
                  padding: const EdgeInsetsDirectional.only(start: 11, end: 7),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    spacing: 6,
                    children: [
                      const LucideIcon(LucideIcons.sparkle, size: 13),
                      Text(
                        templateName!,
                        style: const TextStyle(fontSize: 12),
                        maxLines: 1,
                        softWrap: false,
                      ),
                      if (onClearTemplate != null)
                        remove(
                          t('lab.imgcomposer.removeTemplate'),
                          onClearTemplate!,
                        ),
                    ],
                  ),
                ),
              ),
            ),
          Expanded(
            child: Semantics(
              container: true,
              explicitChildNodes: true,
              label: t('lab.imgcomposer.referenceImages'),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  spacing: 6,
                  children: [
                    for (final (index, ref) in references.indexed)
                      _ReferenceChip(
                        key: ValueKey(ref.id),
                        reference: ref,
                        primary: index == 0,
                        name: index == 0
                            ? t('lab.imgcomposer.mainImage')
                            : ref.name,
                        remove: remove(
                          t('lab.composer.removeItem', {'name': ref.name}),
                          () => onRemoveReference(ref.id),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// `.lab-pc-ref`: thumbnail, name and remove button; it scales in (`lab-pc-in`).
class _ReferenceChip extends StatelessWidget {
  const _ReferenceChip({
    super.key,
    required this.reference,
    required this.primary,
    required this.name,
    required this.remove,
  });
  final ComposerReference reference;
  final bool primary;
  final String name;
  final Widget remove;

  @override
  Widget build(BuildContext context) {
    final c = ThemeProvider.of(context).colors;
    final reduced = reducedMotionOf(context);
    final chip = DecoratedBox(
      decoration: ShapeDecoration(
        color: mixSrgb(c.surface, 0.86, transparent),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: BorderSide(
            color: primary ? mixSrgb(c.primary, 0.60, c.line) : c.line,
          ),
        ),
      ),
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 46),
        child: Padding(
          // 1px border + padding 3px, inline-end 4px.
          padding: const EdgeInsetsDirectional.fromSTEB(4, 4, 5, 4),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            spacing: 7,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: SizedBox.square(
                  dimension: 28,
                  child:
                      reference.preview ??
                      (reference.url.isEmpty
                          ? const SizedBox.shrink()
                          : Image(
                              image: imageProviderFor(reference.url),
                              fit: BoxFit.cover,
                              excludeFromSemantics: true,
                              errorBuilder: (_, _, _) =>
                                  const SizedBox.shrink(),
                            )),
                ),
              ),
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 110),
                child: Text(
                  name,
                  style: const TextStyle(fontSize: 12),
                  maxLines: 1,
                  softWrap: false,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              remove,
            ],
          ),
        ),
      ),
    );
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: reduced ? 1 : 0, end: 1),
      duration: reduced ? Duration.zero : const Duration(milliseconds: 220),
      curve: MotionTokens.easeOut,
      builder: (context, p, child) => Opacity(
        opacity: p.clamp(0, 1),
        child: Transform.scale(scale: 0.94 + 0.06 * p, child: child),
      ),
      child: chip,
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
    this.alignEnd = false,
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

  /// Aligns the content's end edge with the trigger's (`align="end"`).
  final bool alignEnd;

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
    align: widget.inlineSide || !widget.alignEnd
        ? PanelAlign.start
        : PanelAlign.end,
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
    required this.onUpload,
    required this.onPaste,
    required this.onEditPhoto,
  });
  final ImagePromptComposer composer;
  final bool canReference, full;
  final Widget Function(bool open, VoidCallback toggle) trigger;
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
                        ? '$noun · up to ${composer.referenceLimit!.max}'
                        : t('lab.imgcomposer.modelNoReference'),
                    style: TextStyle(fontSize: 11, color: c.muted),
                  ),
                ),
                _MenuItem(
                  focusNode: _upload,
                  icon: LucideIcons.upload,
                  disabled: blocked || !picking,
                  onSelect: () => _select(widget.onUpload),
                  child: const Text('Upload images'),
                ),
                _MenuItem(
                  focusNode: _paste,
                  icon: LucideIcons.clipboardPaste,
                  disabled: blocked || composer.readClipboard == null,
                  onSelect: () => _select(widget.onPaste),
                  child: const Text('Paste from clipboard'),
                ),
                separator(),
                if (composer.recent.isNotEmpty)
                  _subMenu(
                    context,
                    sub: _Sub.recent,
                    node: _recent,
                    icon: LucideIcons.history,
                    label: 'From your images',
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
                  child: const Text('Edit a photo…'),
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
