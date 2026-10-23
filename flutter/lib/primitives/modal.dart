import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import '../brand/geometry.dart';
import '../glass/container.dart';
import '../i18n/i18n.dart';
import '../icons/lucide.dart';
import '../layout/size_reporter.dart';
import '../scroll/metrics.dart';
import '../scroll/scroll_area.dart';
import '../theme.dart';
import '../theme/css_text.dart';
import '../theme/tokens.dart';
import '../toolbar.dart';
import 'button.dart';

/// Spacing a scrollable [Modal] passes to its inner [ScrollArea]: the web kit's `scrollOptions`
/// (`Pick<ScrollAreaProps, 'edgeGap' | 'contentPadding'>`). A null field keeps the area's default.
@immutable
class ScrollOptions {
  const ScrollOptions({this.edgeGap, this.contentPadding});

  /// See [ScrollArea.edgeGap].
  final double? edgeGap;

  /// See [ScrollArea.contentPadding].
  final double? contentPadding;
}

/// A modal dialog: the twin of `Modal` in `@feeef.dev/ui/primitives/modal`. It shows over
/// everything in the nearest [Overlay], traps focus, closes on Escape and on a backdrop tap
/// (calling [close]), and returns focus to where it was after the exit transition. Keep it mounted
/// and toggle [open] so the exit can run.
class Modal extends StatefulWidget {
  const Modal({
    super.key,
    this.open = true,
    required this.close,
    required this.label,
    this.wide = false,
    this.width,
    this.scrollable = false,
    this.fitContent = false,
    this.headerless = false,
    this.showClose = true,
    this.top,
    this.bottom,
    this.initialFocus,
    this.returnFocus,
    this.scrollOptions,
    required this.child,
  });

  /// Whether the dialog is shown.
  final bool open;

  /// Called by Escape, a backdrop tap and the close button. Set [open] to false here.
  final VoidCallback close;

  /// Accessible name; also the default title in a scrollable dialog.
  final String label;

  /// The wider dialog width, for side-by-side content such as two calendars.
  final bool wide;

  /// A fixed dialog width instead of 560px / [wide]'s 980px, still capped by the screen (minus
  /// [wide]'s margin). The web kit sets it with a class, e.g. the temporal dialog's 400px / 680px.
  final double? width;

  /// Full-bleed content with measured floating chrome (a [ScrollArea]).
  final bool scrollable;

  /// Scrollable dialogs: as tall as the content plus its floating chrome (240px until measured),
  /// capped at the screen height minus 32px, instead of a fixed `min(720px, 85%)`. Long content
  /// still scrolls.
  final bool fitContent;

  /// Omit default chrome when the content supplies its own heading and dismiss action.
  final bool headerless;

  /// Hide the default dismiss icon when a visible Cancel/Close action already exists.
  final bool showClose;

  /// Leading header content of a scrollable dialog; the default is the label as a quiet title.
  final Widget? top;

  /// Floating bottom chrome of a scrollable dialog, usually a Dock with its actions.
  final Widget? bottom;

  /// Focused once the dialog opens.
  final FocusNode? initialFocus;

  /// Focused after the dialog finishes closing (the web kit's `returnFocusRef`), even if the
  /// control that opened it is gone. Falls back to whatever had focus before it opened.
  final FocusNode? returnFocus;

  /// Scrollable dialogs only: spacing passed to the inner [ScrollArea].
  final ScrollOptions? scrollOptions;

  final Widget child;

  @override
  State<Modal> createState() => _ModalState();
}

class _ModalState extends State<Modal> with SingleTickerProviderStateMixin {
  final _portal = OverlayPortalController();
  final _scope = FocusScopeNode(debugLabel: 'Modal');
  late final _presence = AnimationController(vsync: this);
  FocusNode? _previous;

  /// The props the dialog shows: latched while open so the exit runs on the last open content.
  late Modal _shown = widget;

  /// Measured heights for [Modal.fitContent]: the body and the floating chrome.
  double? _body;
  double _top = 0, _bottom = 0;

  /// Whether the dialog is in the overlay (open, or running its exit).
  bool _mounted = false;

  @override
  void initState() {
    super.initState();
    // The portal stays shown; `_mounted` decides what it draws (show() can't run during build).
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _portal.show();
    });
    if (widget.open) _show();
  }

  @override
  void didUpdateWidget(Modal old) {
    super.didUpdateWidget(old);
    if (widget.open) _shown = widget;
    if (widget.open && !old.open) _show();
    if (!widget.open && old.open) _hide();
  }

  bool get _reduced => MediaQuery.maybeDisableAnimationsOf(context) ?? false;

  void _show() {
    _previous = FocusManager.instance.primaryFocus;
    _mounted = true;
    // `lab-dialog-in`: 300ms ease-out from 14px lower, 96.5% scale and transparent.
    _presence
      ..duration = const Duration(milliseconds: 300)
      ..forward(from: _presence.value);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || !widget.open) return;
      (_shown.initialFocus ?? _scope).requestFocus();
    });
  }

  Future<void> _hide() async {
    _presence.duration = const Duration(milliseconds: 180);
    await _presence.reverse().orCancel.catchError((_) {});
    if (!mounted || widget.open) return;
    setState(() => _mounted = false);
    final preferred = _shown.returnFocus;
    final target = preferred != null && preferred.context != null
        ? preferred
        : _previous;
    if (target != null && target.context != null) target.requestFocus();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_reduced && widget.open) _presence.value = 1;
  }

  @override
  void dispose() {
    _presence.dispose();
    _scope.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => OverlayPortal(
    controller: _portal,
    overlayChildBuilder: (context) => _mounted
        ? GlassLayer(child: _dialog(context))
        : const SizedBox.shrink(),
  );

  void _measured(void Function() update) {
    if (mounted) setState(update);
  }

  /// `--lab-modal-content-height`: body + padding (the floats' reservations) + the 1px borders,
  /// at least the floats and their edge gaps.
  double _fitHeight(double gap, double padding) {
    final body = _body;
    if (body == null) return 240;
    final top = _shown.top != null || !_shown.headerless ? _top : 0.0;
    final bottom = _shown.bottom != null ? _bottom : 0.0;
    final chrome = top + bottom + (top > 0 ? gap : 0) + (bottom > 0 ? gap : 0);
    final content =
        body +
        scrollContentReserve(top, gap, padding) +
        scrollContentReserve(bottom, gap, padding) +
        2;
    return (content > chrome ? content : chrome).ceilToDouble();
  }

  Widget _dialog(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final s = theme.sizes;
    final screen = MediaQuery.sizeOf(context);
    final shown = _shown;
    final width = shown.width ?? (shown.wide ? 980.0 : 560.0);
    final margin = shown.wide ? 40.0 : 28.0;
    final radius = s.radiusPanel;
    final open = widget.open;
    final fit = shown.scrollable && shown.fitContent;
    final maxHeight = fit ? screen.height - 32 : screen.height * 0.9;
    Widget body;
    if (shown.scrollable) {
      final gap = shown.scrollOptions?.edgeGap ?? 12;
      final padding = shown.scrollOptions?.contentPadding ?? 24;
      final top = shown.headerless ? shown.top : _header(context);
      Widget measure(Widget? child, ValueChanged<double> onHeight) =>
          child == null || !fit
          ? child ?? const SizedBox.shrink()
          : SizeReporter(
              onSize: (size) => _measured(() => onHeight(size.height)),
              child: child,
            );
      body = SizedBox(
        height: fit
            ? _fitHeight(gap, padding).clamp(0, maxHeight)
            : (screen.height * 0.85).clamp(0, 720),
        child: ScrollArea(
          label: shown.label,
          top: top == null ? null : measure(top, (h) => _top = h),
          bottom: shown.bottom == null
              ? null
              : measure(shown.bottom, (h) => _bottom = h),
          edgeGap: gap,
          contentPadding: padding,
          radius: radius,
          // `.lab-modal-measured-body`: measured at its own height, not stretched to the area's
          // min-height (which would feed the measurement back into itself).
          child: fit
              ? Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    SizeReporter(
                      onSize: (size) => _measured(() => _body = size.height),
                      child: shown.child,
                    ),
                  ],
                )
              : shown.child,
        ),
      );
    } else {
      body = Stack(
        children: [
          SingleChildScrollView(child: shown.child),
          if (!shown.headerless && shown.showClose)
            PositionedDirectional(
              top: 12,
              end: 12,
              child: IconButton(
                variant: ButtonVariant.ghost,
                ariaLabel: I18n.of(context).t('lab.common.close'),
                onClick: open ? widget.close : null,
                icon: const LucideX(size: 18),
              ),
            ),
        ],
      );
    }
    final dialog = ConstrainedBox(
      constraints: BoxConstraints(
        maxWidth: (screen.width - margin).clamp(0, width),
        minWidth: (screen.width - margin).clamp(0, width),
        maxHeight: maxHeight,
      ),
      child: DecoratedBox(
        decoration: ShapeDecoration(
          color: c.surface,
          shape: SuperellipseBorder(
            radius: radius,
            side: BorderSide(color: c.line),
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.all(1),
          child: ClipPath(
            clipper: ShapeBorderClipper(
              shape: SuperellipseBorder(radius: radius - 1),
            ),
            child: DefaultTextStyle.merge(
              style: TextStyle(
                fontSize: 15,
                height: 23 / 15,
                leadingDistribution: TextLeadingDistribution.even,
                color: c.ink,
              ),
              // The dialog sits away from the screen edges: no safe-area insets inside it.
              child: MediaQuery.removePadding(
                context: context,
                removeTop: true,
                removeBottom: true,
                removeLeft: true,
                removeRight: true,
                child: body,
              ),
            ),
          ),
        ),
      ),
    );
    return Shortcuts(
      shortcuts: const {
        SingleActivator(LogicalKeyboardKey.escape): DismissIntent(),
      },
      child: Actions(
        actions: {
          DismissIntent: CallbackAction<DismissIntent>(
            onInvoke: (_) {
              if (widget.open) widget.close();
              return null;
            },
          ),
        },
        child: FocusScope(
          node: _scope,
          child: AnimatedBuilder(
            animation: _presence,
            builder: (context, child) {
              final t = _presence.value;
              final opening = _presence.status != AnimationStatus.reverse;
              // Opening eases out from (14px, 96.5%); closing falls to (8px, 98%).
              final e = opening
                  ? MotionTokens.easeOut.transform(t)
                  : 1 - MotionTokens.easeIn.transform(1 - t);
              final dy = (opening ? 14 : 8) * (1 - e);
              final scale = 1 - (opening ? 0.035 : 0.02) * (1 - e);
              return Stack(
                children: [
                  Positioned.fill(
                    child: GestureDetector(
                      behavior: HitTestBehavior.opaque,
                      onTap: widget.open ? widget.close : null,
                      child: ColoredBox(
                        // ::backdrop: rgb(12 24 17 / 40%).
                        color: Color.from(
                          alpha: 0.4 * e,
                          red: 12 / 255,
                          green: 24 / 255,
                          blue: 17 / 255,
                        ),
                      ),
                    ),
                  ),
                  Center(
                    child: IgnorePointer(
                      ignoring: !widget.open,
                      child: Opacity(
                        opacity: e.clamp(0, 1),
                        child: Transform.translate(
                          offset: Offset(0, dy),
                          child: Transform.scale(scale: scale, child: child),
                        ),
                      ),
                    ),
                  ),
                ],
              );
            },
            child: Semantics(
              scopesRoute: true,
              namesRoute: true,
              explicitChildNodes: true,
              label: shown.label,
              // Taps inside the dialog never reach the backdrop.
              child: GestureDetector(onTap: () {}, child: dialog),
            ),
          ),
        ),
      ),
    );
  }

  /// The default floating header of a scrollable dialog: title group, close group.
  Widget _header(BuildContext context) => GlassScope(
    child: Row(
      spacing: 12,
      children: [
        Expanded(
          child: Align(
            alignment: AlignmentDirectional.centerStart,
            child:
                _shown.top ??
                ToolbarGroup(
                  label: 'Dialog title',
                  children: [
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 10),
                      child: DefaultTextStyle.merge(
                        style: const TextStyle(
                          fontSize: 13,
                          height: 20 / 13,
                          leadingDistribution: TextLeadingDistribution.even,
                          fontWeight: FontWeight.w500,
                          letterSpacing: 13 * -0.02,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        child: CssBaseline(
                          lineHeight: 20,
                          child: Semantics(
                            header: true,
                            child: Text(_shown.label),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
          ),
        ),
        if (_shown.showClose)
          ToolbarGroup(
            label: 'Dialog close action',
            children: [
              IconButton(
                appearance: ButtonAppearance.toolbar,
                controlSize: ControlSize.regular,
                ariaLabel: I18n.of(context)
                    .t('lab.composer.closeLabel', {'label': _shown.label}),
                onClick: widget.open ? widget.close : null,
                icon: const LucideX(size: 20),
              ),
            ],
          ),
      ],
    ),
  );
}
