/// The model quality ladder: the Dart twin of `@feeef.dev/ui/model-ladder` (+ `model-ladder.css`).
/// Web port of marchant `tools/ai/widgets/model_ladder_selector.dart`, ported back with the web
/// kit's look.
library;

import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/scheduler.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import 'brand/geometry.dart';
import 'i18n/i18n.dart';
import 'icons/lucide.dart';
import 'menu/anchored_panel.dart';
import 'model_ladder_core.dart';
import 'primitives/button.dart';
import 'primitives/popover_surface.dart';
import 'primitives/slider.dart';
import 'scroll/scroll_area.dart';
import 'theme.dart';
import 'theme/color_mix.dart';
import 'theme/light_edge.dart';
import 'theme/surfaces.dart';
import 'theme/tokens.dart';
import 'toolbar_search.dart';

export 'model_ladder_core.dart';

bool _reduced(BuildContext context) =>
    MediaQuery.maybeDisableAnimationsOf(context) ?? false;

/// Localized ladder copy (`useLadderCopy`); an explicit [copy] still wins (fixtures, tests).
LadderCopy ladderCopyOf(BuildContext context, [LadderCopy? copy]) {
  if (copy != null) return copy;
  final i18n = I18n.of(context);
  return LadderCopy(
    quality: i18n.t('lab.ladder.quality'),
    reset: i18n.t('lab.ladder.reset'),
    fast: i18n.t('lab.ladder.fast'),
    balanced: i18n.t('lab.ladder.balanced'),
    best: i18n.t('lab.ladder.best'),
    pickModel: i18n.t('lab.ladder.pickModel'),
    searchModels: i18n.t('lab.ladder.searchModels'),
    noMatches: i18n.t('lab.ladder.noMatches'),
    back: i18n.t('lab.ladder.back'),
    typical: (price) => i18n.t('lab.ladder.typical', {'price': price}),
  );
}

/// `chip` shows the tier and model name; `icon` is a compact brain button like marchant.
enum ModelLadderVariant { chip, icon }

// --------------------------------------------------------------------------------- trigger

/// Quality picker: a trigger (chip or icon) that opens a popover with the ladder card. Moves
/// between curated models with one slider, cheapest first; the title opens the full model list.
class ModelLadder extends StatefulWidget {
  const ModelLadder({
    super.key,
    required this.stops,
    required this.index,
    this.defaultIndex = 0,
    required this.onChange,
    this.enabled = true,
    this.canvas,
    this.belowModel,
    this.catalog,
    this.onPickModel,
    this.onBrowseModels,
    this.onOpenChange,
    this.selectedModel,
    this.copy,
    this.variant = ModelLadderVariant.chip,
    this.align = PanelAlign.start,
    this.side = PanelSide.top,
  });

  /// The quality rungs, cheapest first. Nothing renders when empty.
  final List<LadderStop> stops;

  /// Selected rung (controlled). Clamped to the stops.
  final int index;

  /// The rung "Reset to default" returns to.
  final int defaultIndex;

  /// Called with the new rung index.
  final ValueChanged<int> onChange;

  /// `false` disables the trigger so the popover cannot open.
  final bool enabled;

  /// Size and aspect readout of the output canvas, shown under the title.
  final AspectReadout? canvas;

  /// Extra controls under the model switch (e.g. a length or shape picker).
  final Widget? belowModel;

  /// Every model the user may pick from the title list; defaults to the ladder rungs.
  final List<LadderStop>? catalog;

  /// Called when the user picks a catalog model that is not one of the rungs.
  final ValueChanged<String>? onPickModel;

  /// Replaces the built-in model list: the title button closes the popover and calls this.
  final VoidCallback? onBrowseModels;

  /// Called when the popover opens or closes.
  final ValueChanged<bool>? onOpenChange;

  /// A specific catalog choice outside the curated quality ladder.
  final LadderStop? selectedModel;

  /// Overrides the localized strings.
  final LadderCopy? copy;

  /// `chip` shows the tier and model name; `icon` is a compact brain button like marchant.
  final ModelLadderVariant variant;

  /// Popover alignment against the trigger.
  final PanelAlign align;

  /// Which side of the trigger the popover opens on (it flips when there is no room).
  final PanelSide side;

  @override
  State<ModelLadder> createState() => _ModelLadderState();
}

class _ModelLadderState extends State<ModelLadder>
    with SingleTickerProviderStateMixin {
  final _trigger = GlobalKey();
  final _focus = FocusNode(debugLabel: 'ladder trigger');
  late final _pop = AnimationController(vsync: this);
  bool _shown = false;
  bool _closing = false;

  bool get _open => _shown && !_closing;

  @override
  void dispose() {
    _pop.dispose();
    _focus.dispose();
    super.dispose();
  }

  void _setOpen(bool next) {
    if (next == _open) return;
    if (next) {
      setState(() {
        _closing = false;
        _shown = true;
      });
      _pop.duration = const Duration(milliseconds: 220);
      if (_reduced(context)) {
        _pop.value = 1;
      } else {
        _pop.forward(from: 0);
      }
    } else {
      setState(() => _closing = true);
      _pop.duration = const Duration(milliseconds: 140);
      void hide() {
        if (!mounted || !_closing) return;
        setState(() {
          _closing = false;
          _shown = false;
        });
      }

      if (_reduced(context)) {
        _pop.value = 0;
        hide();
      } else {
        _pop.reverse().whenComplete(hide);
      }
      _focus.requestFocus();
    }
    widget.onOpenChange?.call(next);
  }

  @override
  Widget build(BuildContext context) {
    if (widget.stops.isEmpty) return const SizedBox.shrink();
    final copy = ladderCopyOf(context, widget.copy);
    final stops = widget.stops;
    final safe = clamp(widget.index.toDouble(), 0, stops.length - 1.0).toInt();
    final current = widget.selectedModel ?? stops[safe];
    final tier = widget.selectedModel != null
        ? displayName(current, safe, stops.length, copy)
        : visibleLabel(current, safe, stops.length, copy);
    final name = displayName(current, safe, stops.length, copy);
    final top = safe == stops.length - 1 && stops.length > 1;
    // Radix: flips to the other side when it doesn't fit, shifts to stay 12px inside its bounds.
    return AnchoredPanel(
      open: _shown,
      side: widget.side,
      align: widget.align,
      sideOffset: 8,
      panel: (context) => _popover(context, copy, safe),
      child: TapRegion(
        groupId: this,
        child: KeyedSubtree(
          key: _trigger,
          child: _Trigger(
            variant: widget.variant,
            enabled: widget.enabled,
            open: _open,
            top: top,
            tier: tier,
            name: name,
            focusNode: _focus,
            label: '${copy.quality}: $tier${tier == name ? '' : ', $name'}',
            onTap: () => _setOpen(!_open),
          ),
        ),
      ),
    );
  }

  Widget _popover(BuildContext context, LadderCopy copy, int safe) {
    final theme = ThemeProvider.of(context);
    final rtl = Directionality.of(context) == TextDirection.rtl;
    final onTop = widget.side == PanelSide.top;
    final originX = switch ((widget.align, rtl)) {
      (PanelAlign.start, false) || (PanelAlign.end, true) => -1.0,
      (PanelAlign.end, false) || (PanelAlign.start, true) => 1.0,
      (PanelAlign.center, _) => 0.0,
    };
    final card = ModelLadderCard(
      stops: widget.stops,
      index: safe,
      defaultIndex: widget.defaultIndex,
      onChange: widget.onChange,
      canvas: widget.canvas,
      belowModel: widget.belowModel,
      catalog: widget.catalog,
      onPickModel: widget.onPickModel,
      onBrowseModels: widget.onBrowseModels == null
          ? null
          : () {
              _setOpen(false);
              widget.onBrowseModels!();
            },
      selectedModel: widget.selectedModel,
      copy: copy,
    );
    return LayoutBuilder(
      builder: (context, constraints) => TapRegion(
        groupId: this,
        onTapOutside: (_) => _setOpen(false),
        child: Focus(
          onKeyEvent: (_, event) {
            if (event is KeyDownEvent &&
                event.logicalKey == LogicalKeyboardKey.escape) {
              _setOpen(false);
              return KeyEventResult.handled;
            }
            return KeyEventResult.ignored;
          },
          child: AnimatedBuilder(
            animation: _pop,
            builder: (context, child) {
              // lab-ladder-pop: from opacity 0, translateY(4px) scale(.97); out with ease-in.
              final t = _closing
                  ? 1 - Curves.easeIn.transform(1 - _pop.value)
                  : MotionTokens.easeOut.transform(_pop.value);
              final s = 0.97 + 0.03 * t;
              return IgnorePointer(
                ignoring: _closing,
                child: Opacity(
                  opacity: t.clamp(0.0, 1.0),
                  child: Transform(
                    alignment: Alignment(originX, onTop ? 1 : -1),
                    transform: Matrix4.translationValues(0, 4 * (1 - t), 0)
                      ..scaleByDouble(s, s, 1, 1),
                    child: child,
                  ),
                ),
              );
            },
            child: SizedBox(
              width: math.min(350.0, constraints.maxWidth),
              child: _PopoverScope(
                autofocus: true,
                listHeight: math.max(
                  120.0,
                  math.min(440.0, constraints.maxHeight),
                ),
                child: CustomPaint(
                  foregroundPainter: glassStyleOf(context) == GlassStyle.solid
                      ? null
                      : _RimPainter(
                          theme.sizes.radiusGroup,
                          theme.colors.glassEdgeLight,
                          theme.colors.glassEdgeLow,
                        ),
                  child: PopoverSurface(seed: 'lab-ladder', child: card),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// The card's `.lab-light-edge` ring, drawn on the popover's border when the card sits in one.
class _RimPainter extends CustomPainter {
  _RimPainter(this.radius, this.light, this.low);
  final double radius;
  final Color light, low;
  @override
  void paint(Canvas canvas, Size size) =>
      paintLightEdge(canvas, size, radius, light: light, low: low);
  @override
  bool shouldRepaint(_RimPainter old) =>
      old.radius != radius || old.light != light || old.low != low;
}

/// Tells a card it sits in the ladder popover: no own paint, first focus on the slider.
class _PopoverScope extends InheritedWidget {
  const _PopoverScope({
    required this.autofocus,
    required this.listHeight,
    required super.child,
  });
  final bool autofocus;
  final double listHeight;
  @override
  bool updateShouldNotify(_PopoverScope old) =>
      old.autofocus != autofocus || old.listHeight != listHeight;
}

/// `.lab-ladder-trigger`: a 44px chip (5px | 12px padding, 18px corners) or a 40px icon button
/// (14px corners, 44px on touch screens), primary-tinted on hover, press and while open.
class _Trigger extends StatelessWidget {
  const _Trigger({
    required this.variant,
    required this.enabled,
    required this.open,
    required this.top,
    required this.tier,
    required this.name,
    required this.focusNode,
    required this.label,
    required this.onTap,
  });
  final ModelLadderVariant variant;
  final bool enabled, open, top;
  final String tier, name, label;
  final FocusNode focusNode;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final icon = variant == ModelLadderVariant.icon;
    final side = icon && theme.coarsePointer(context) ? 44.0 : 40.0;
    final tint = mixSrgb(c.primary, 0.14, transparent);
    final badge = _TriggerIcon(top: top, icon: icon);
    return _LadderControl(
      onTap: enabled ? onTap : null,
      disabled: !enabled,
      focusNode: focusNode,
      label: label,
      expanded: open,
      height: icon ? side : 44,
      width: icon ? side : null,
      radius: icon ? 14 : 18,
      padding: icon
          ? EdgeInsetsDirectional.zero
          : const EdgeInsetsDirectional.fromSTEB(5, 4, 12, 4),
      bordered: true,
      fill: open ? tint : transparent,
      hover: tint,
      pressed: mixSrgb(c.primary, 0.20, transparent),
      edge: open ? mixSrgb(c.primary, 0.30, c.line) : transparent,
      child: icon
          ? Center(child: badge)
          : Row(
              mainAxisSize: MainAxisSize.min,
              spacing: 8,
              children: [
                badge,
                Flexible(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _EnterOnKey(
                        key: ValueKey(tier),
                        child: Text(
                          tier,
                          maxLines: 1,
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                            height: 15 / 13,
                            leadingDistribution: TextLeadingDistribution.even,
                          ),
                        ),
                      ),
                      Text(
                        name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        softWrap: false,
                        style: TextStyle(
                          fontSize: 10,
                          height: 12 / 10,
                          leadingDistribution: TextLeadingDistribution.even,
                          color: c.muted,
                        ),
                      ),
                    ],
                  ),
                ),
                const LucideChevronDown(size: 18),
              ],
            ),
    );
  }
}

/// `.lab-ladder-trigger-icon`: a 32px tile with the brain, fire-gradient on the top rung.
class _TriggerIcon extends StatelessWidget {
  const _TriggerIcon({required this.top, required this.icon});
  final bool top, icon;

  @override
  Widget build(BuildContext context) {
    final c = ThemeProvider.of(context).colors;
    final ink = top ? const Color(0xFFFFF6C4) : c.ink;
    return SizedBox.square(
      dimension: 32,
      child: CustomPaint(
        painter: _TilePainter(
          fill: icon && !top ? null : mixSrgb(c.primary, 0.18, c.surface),
          fire: top,
        ),
        child: Center(
          child: LucideBrain(
            size: icon ? 20 : 16,
            color: ink,
            strokeWidth: 1.75,
          ),
        ),
      ),
    );
  }
}

class _TilePainter extends CustomPainter {
  _TilePainter({required this.fill, required this.fire});
  final Color? fill;
  final bool fire;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final shape = superellipsePath(rect, const [12, 12, 12, 12]);
    final paint = Paint();
    if (fire) {
      paint.shader = _cssLinear(
        rect,
        160,
        const [Color(0xFFFFD54A), Color(0xFFFF4D0A), Color(0xFFA32008)],
        const [0, 0.7, 1],
      );
    } else if (fill != null) {
      paint.color = fill!;
    } else {
      return;
    }
    canvas.drawPath(shape, paint);
  }

  @override
  bool shouldRepaint(_TilePainter old) => old.fill != fill || old.fire != fire;
}

/// A CSS `linear-gradient(<angle>deg, …)` over [rect]: 0deg points up, angles turn clockwise,
/// and the gradient line is long enough for the corners to reach the end colours.
ui.Gradient _cssLinear(
  Rect rect,
  double degrees,
  List<Color> colors,
  List<double> stops,
) {
  final a = degrees * math.pi / 180;
  final direction = Offset(math.sin(a), -math.cos(a));
  final half =
      (rect.width * math.sin(a).abs() + rect.height * math.cos(a).abs()) / 2;
  return ui.Gradient.linear(
    rect.center - direction * half,
    rect.center + direction * half,
    colors,
    stops,
  );
}

/// Replays `lab-ladder-in` (260ms ease-out from opacity 0, 25% lower) whenever its key changes.
class _EnterOnKey extends StatelessWidget {
  const _EnterOnKey({super.key, required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    if (_reduced(context)) return child;
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: const Duration(milliseconds: 260),
      curve: MotionTokens.easeOut,
      builder: (context, t, child) => Opacity(
        opacity: t,
        child: FractionalTranslation(
          translation: Offset(0, 0.25 * (1 - t)),
          child: child,
        ),
      ),
      child: child,
    );
  }
}

// ------------------------------------------------------------------------------------ card

/// The ladder card: tier title, model switch, canvas readout, extra controls and the track.
class ModelLadderCard extends StatefulWidget {
  const ModelLadderCard({
    super.key,
    required this.stops,
    required this.index,
    this.defaultIndex = 0,
    required this.onChange,
    this.canvas,
    this.belowModel,
    this.catalog,
    this.onPickModel,
    this.onBrowseModels,
    this.selectedModel,
    this.copy,
    this.pickable = true,
  });

  /// The quality rungs, cheapest first. Needs at least one.
  final List<LadderStop> stops;

  /// Selected rung (controlled). Clamped to the stops.
  final int index;

  /// The rung "Reset to default" returns to.
  final int defaultIndex;

  /// Called with the new rung index.
  final ValueChanged<int> onChange;

  /// Size and aspect readout of the output canvas, shown under the title.
  final AspectReadout? canvas;

  /// Extra controls between the readout and the track.
  final Widget? belowModel;

  /// Every model the user may pick from the title list; defaults to the ladder rungs.
  final List<LadderStop>? catalog;

  /// Called when the user picks a catalog model that is not one of the rungs.
  final ValueChanged<String>? onPickModel;

  /// Replaces the built-in model list: the title button calls this instead.
  final VoidCallback? onBrowseModels;

  /// A specific catalog choice outside the curated quality ladder.
  final LadderStop? selectedModel;

  /// Overrides the localized strings.
  final LadderCopy? copy;

  /// `false` turns the title into a plain label with no model list.
  final bool pickable;

  @override
  State<ModelLadderCard> createState() => _ModelLadderCardState();
}

class _ModelLadderCardState extends State<ModelLadderCard> {
  bool _picking = false;
  bool _restoreTitleFocus = false;
  bool _focused = false;
  final _title = FocusNode(debugLabel: 'ladder title');
  final _slider = FocusNode(debugLabel: 'ladder slider');

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final scope = context.getInheritedWidgetOfExactType<_PopoverScope>();
    if (scope != null && scope.autofocus && !_focused) {
      _focused = true;
      // Focus the slider, not the first button, so arrows move the ladder right away.
      SchedulerBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        (_slider.context != null ? _slider : _title).requestFocus();
      });
    }
  }

  @override
  void dispose() {
    _title.dispose();
    _slider.dispose();
    super.dispose();
  }

  void _returnToLadder() {
    _restoreTitleFocus = true;
    setState(() => _picking = false);
    SchedulerBinding.instance.addPostFrameCallback((_) {
      if (!mounted || !_restoreTitleFocus) return;
      _restoreTitleFocus = false;
      _title.requestFocus();
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final s = theme.sizes;
    final i18n = I18n.of(context);
    final copy = ladderCopyOf(context, widget.copy);
    final stops = widget.stops;
    final count = stops.length;
    final safe = clamp(widget.index.toDouble(), 0, count - 1.0).toInt();
    final stop = widget.selectedModel ?? stops[safe];
    final last = safe >= count - 1 && count > 1;
    final title = widget.selectedModel != null
        ? displayName(stop, safe, count, copy)
        : visibleLabel(stop, safe, count, copy);
    final name = displayName(stop, safe, count, copy);
    final safeDefault = clamp(
      widget.defaultIndex.toDouble(),
      0,
      count - 1.0,
    ).toInt();
    final catalog = widget.catalog;
    final opens =
        widget.pickable &&
        (count > 1 ||
            (catalog != null && catalog.isNotEmpty) ||
            widget.onBrowseModels != null);

    if (_picking) {
      return _CardFrame(
        list: true,
        child: _ModelList(
          items: catalog != null && catalog.isNotEmpty ? catalog : stops,
          tiers: stops,
          selectedId: stop.modelId,
          copy: copy,
          onBack: _returnToLadder,
          onPick: (modelId) {
            final rung = stops.indexWhere((row) => row.modelId == modelId);
            if (rung >= 0) {
              widget.onChange(rung);
            } else {
              widget.onPickModel?.call(modelId);
            }
            _returnToLadder();
          },
        ),
      );
    }

    final price = stop.priceUsd;
    final canvas = widget.canvas;
    return _CardFrame(
      list: false,
      child: DefaultTextStyle.merge(
        style: TextStyle(color: c.ink),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              spacing: 8,
              children: [
                LucideZap(size: 18, strokeWidth: 1.5, color: c.muted),
                Expanded(
                  child: _LadderControl(
                    onTap: opens
                        ? () {
                            if (widget.onBrowseModels != null) {
                              widget.onBrowseModels!();
                            } else {
                              setState(() => _picking = true);
                            }
                          }
                        : null,
                    disabled: !opens,
                    focusNode: _title,
                    label:
                        '${copy.pickModel}. $title${title == name ? '' : ', $name'}',
                    height: s.controlHeight,
                    radius: 10,
                    padding: const EdgeInsetsDirectional.symmetric(
                      horizontal: 6,
                      vertical: 2,
                    ),
                    fill: transparent,
                    hover: c.controlHover,
                    pressed: c.controlPressed,
                    edge: transparent,
                    child: Row(
                      spacing: 6,
                      children: [
                        Expanded(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            crossAxisAlignment: CrossAxisAlignment.start,
                            spacing: 2,
                            children: [
                              Row(
                                spacing: 6,
                                children: [
                                  Flexible(
                                    child: _EnterOnKey(
                                      key: ValueKey(title),
                                      child: _Tier(text: title, top: last),
                                    ),
                                  ),
                                  if (stop.access != null)
                                    _AccessBadge(
                                      access: stop.access!,
                                      label: stop.access == LadderAccess.free
                                          ? i18n.t('lab.common.free')
                                          : i18n.t('lab.common.pro'),
                                    ),
                                ],
                              ),
                              if (name != title)
                                Text(
                                  name,
                                  maxLines: 1,
                                  softWrap: false,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    fontSize: 12,
                                    height: 16 / 12,
                                    leadingDistribution:
                                        TextLeadingDistribution.even,
                                    color: c.muted,
                                  ),
                                ),
                            ],
                          ),
                        ),
                        if (opens) LucideChevronDown(size: 14, color: c.muted),
                      ],
                    ),
                  ),
                ),
                _LadderControl(
                  onTap: () => widget.onChange(safeDefault),
                  disabled: widget.selectedModel == null && safe == safeDefault,
                  label: copy.reset,
                  height: s.controlHeight,
                  width: s.controlHeight,
                  radius: s.radiusControl,
                  padding: EdgeInsetsDirectional.zero,
                  fill: transparent,
                  hover: c.controlHover,
                  pressed: c.controlPressed,
                  edge: transparent,
                  child: const Center(child: LucideRotateCcw(size: 20)),
                ),
              ],
            ),
            if (price != null && price != 0 && stop.access != LadderAccess.free)
              Padding(
                padding: const EdgeInsetsDirectional.only(start: 34, top: 4),
                child: Text(
                  copy.typical(formatUsd(price)),
                  style: TextStyle(fontSize: 11, color: c.muted),
                ),
              ),
            if (canvas != null)
              Padding(
                padding: const EdgeInsetsDirectional.only(top: 10),
                child: Directionality(
                  textDirection: TextDirection.ltr,
                  child: Padding(
                    padding: const EdgeInsets.only(left: 4),
                    child: Row(
                      spacing: 8,
                      children: [
                        AspectBox(widthOverHeight: canvas.widthOverHeight),
                        Text(
                          canvas.size,
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                            fontFeatures: [ui.FontFeature.tabularFigures()],
                          ),
                        ),
                        Text(
                          canvas.aspect,
                          style: TextStyle(fontSize: 12, color: c.muted),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            if (widget.belowModel != null)
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: widget.belowModel,
              ),
            if (widget.selectedModel == null)
              Padding(
                padding: const EdgeInsets.only(top: 14),
                child: _LadderTrack(
                  count: count,
                  index: safe,
                  onChange: widget.onChange,
                  label: copy.quality,
                  focusNode: _slider,
                  valueText: (i) =>
                      '${visibleLabel(stops[i], i, count, copy)}, ${displayName(stops[i], i, count, copy)}',
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// `.lab-ladder-tier`: 500 16px/20px, -0.02em, ellipsis; the top rung is painted in fire.
class _Tier extends StatelessWidget {
  const _Tier({required this.text, required this.top});
  final String text;
  final bool top;

  @override
  Widget build(BuildContext context) {
    Widget label = Text(
      text,
      maxLines: 1,
      softWrap: false,
      overflow: TextOverflow.ellipsis,
      style: TextStyle(
        fontSize: 16,
        fontWeight: FontWeight.w500,
        letterSpacing: 16 * -0.02,
        height: 20 / 16,
        leadingDistribution: TextLeadingDistribution.even,
        color: top ? const Color(0xFFFFFFFF) : null,
      ),
    );
    if (top) {
      label = ShaderMask(
        blendMode: BlendMode.srcIn,
        shaderCallback: (bounds) => _cssLinear(
          bounds,
          95,
          const [Color(0xFFFF4D0A), Color(0xFFFF9A1F), Color(0xFFFFD54A)],
          const [0, 0.55, 1],
        ),
        child: label,
      );
    }
    return Semantics(liveRegion: true, child: label);
  }
}

/// `.lab-model-access`: a small bordered Free / Pro tag.
class _AccessBadge extends StatelessWidget {
  const _AccessBadge({required this.access, required this.label});
  final LadderAccess access;
  final String label;

  @override
  Widget build(BuildContext context) {
    final c = ThemeProvider.of(context).colors;
    final free = access == LadderAccess.free;
    return DecoratedBox(
      decoration: ShapeDecoration(
        color: free ? c.surfaceSoft : null,
        shape: SuperellipseBorder(radius: 6, side: BorderSide(color: c.line)),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w500,
            height: 17 / 11,
            leadingDistribution: TextLeadingDistribution.even,
            color: free ? c.ink : c.muted,
          ),
        ),
      ),
    );
  }
}

/// `.lab-ladder-card`: 12px padding, 1px border, 26px corners, the floating surface and its light
/// edge. Inside the ladder popover the popover paints instead (`.lab-popover-surface >
/// .lab-ladder-card`). The model list has no padding and a fixed height.
class _CardFrame extends StatelessWidget {
  const _CardFrame({required this.list, required this.child});
  final bool list;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final scope = context.dependOnInheritedWidgetOfExactType<_PopoverScope>();
    final screen = MediaQuery.sizeOf(context).height;
    final content = list
        ? SizedBox(
            height:
                scope?.listHeight ??
                math.max(120.0, math.min(440.0, screen - 24)),
            child: child,
          )
        : Padding(padding: const EdgeInsets.all(12), child: child);
    if (scope != null) return content;
    return CustomPaint(
      painter: _CardPainter(
        fill: c.surface,
        line: c.line,
        edgeLow: c.glassEdgeLow,
        edgeLight: c.glassEdgeLight,
        shadow: glassShadowColor(theme.brightness),
        rim: glassStyleOf(context) != GlassStyle.solid,
      ),
      child: Padding(padding: const EdgeInsets.all(1), child: content),
    );
  }
}

class _CardPainter extends CustomPainter {
  _CardPainter({
    required this.fill,
    required this.line,
    required this.edgeLow,
    required this.edgeLight,
    required this.shadow,
    required this.rim,
  });
  final Color fill, line, edgeLow, edgeLight, shadow;
  final bool rim;

  @override
  void paint(Canvas canvas, Size size) {
    paintFloatingSurface(
      canvas,
      size,
      26,
      fill: fill,
      line: line,
      edgeLow: edgeLow,
      shadow: shadow,
    );
    if (rim) paintLightEdge(canvas, size, 26, light: edgeLight, low: edgeLow);
  }

  @override
  bool shouldRepaint(_CardPainter old) =>
      old.fill != fill ||
      old.line != line ||
      old.edgeLow != edgeLow ||
      old.edgeLight != edgeLight ||
      old.shadow != shadow ||
      old.rim != rim;
}

/// A rectangle at the true proportions, fitted inside a square so every ratio lines up.
class AspectBox extends StatelessWidget {
  const AspectBox({super.key, required this.widthOverHeight, this.box = 20});

  /// Aspect ratio as width divided by height.
  final double widthOverHeight;

  /// Side of the square it is fitted into, in pixels.
  final double box;

  @override
  Widget build(BuildContext context) {
    final c = ThemeProvider.of(context).colors;
    final ratio = widthOverHeight > 0 ? widthOverHeight : 1.0;
    final w = ratio >= 1 ? box : box * ratio;
    final h = ratio >= 1 ? box / ratio : box;
    return ExcludeSemantics(
      child: SizedBox.square(
        dimension: box,
        child: Center(
          child: SizedBox(
            width: math.max(4, w),
            height: math.max(4, h),
            child: DecoratedBox(
              decoration: ShapeDecoration(
                shape: SuperellipseBorder(
                  radius: 2,
                  side: BorderSide(color: c.primary, width: 1.5),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ----------------------------------------------------------------------------------- track

/// Domain decoration on the shared slider; the interaction engine lives in primitives.
class _LadderTrack extends StatelessWidget {
  const _LadderTrack({
    required this.count,
    required this.index,
    required this.onChange,
    required this.label,
    required this.valueText,
    required this.focusNode,
  });
  final int count, index;
  final ValueChanged<int> onChange;
  final String label;
  final String Function(int index) valueText;
  final FocusNode focusNode;

  @override
  Widget build(BuildContext context) {
    final reduced = _reduced(context);
    return Slider(
      label: label,
      min: 0,
      max: math.max(0, count - 1).toDouble(),
      step: 1,
      value: index.toDouble(),
      disabled: count <= 1,
      focusNode: focusNode,
      onValueChange: (value) => onChange(value.round()),
      getValueText: (value) =>
          valueText(value.round().clamp(0, math.max(0, count - 1))),
      showStops: true,
      renderFill: (state) {
        final heat = heatAt(state.position, count);
        return AnimatedOpacity(
          opacity: heat,
          duration: state.dragging || reduced
              ? Duration.zero
              : const Duration(milliseconds: 320),
          curve: MotionTokens.easeOut,
          child: heat > 0 ? const _PixelFire() : const SizedBox.expand(),
        );
      },
    );
  }
}

// ------------------------------------------------------------------------------------ fire

/// Square cells flicker and rise through fire colours, about 12 steps a second.
class _PixelFire extends StatefulWidget {
  const _PixelFire();

  @override
  State<_PixelFire> createState() => _PixelFireState();
}

class _PixelFireState extends State<_PixelFire>
    with SingleTickerProviderStateMixin {
  late final _ticker = createTicker(_tick);
  int _step = 0;

  void _tick(Duration elapsed) {
    final step = (elapsed.inMilliseconds ~/ 83) % 12;
    if (step != _step) setState(() => _step = step);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_reduced(context)) {
      _ticker.stop();
      _step = 0;
    } else if (!_ticker.isActive) {
      _ticker.start();
    }
  }

  @override
  void dispose() {
    _ticker.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => ExcludeSemantics(
    child: SizedBox.expand(child: CustomPaint(painter: _FirePainter(_step))),
  );
}

class _FirePainter extends CustomPainter {
  _FirePainter(this.step);
  final int step;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..isAntiAlias = false;
    canvas.drawRect(Offset.zero & size, paint..color = firePalette[0]);
    final cols = (size.width / fireCellSize).ceil();
    final rows = (size.height / fireCellSize).ceil();
    for (var row = 0; row < rows; row++) {
      for (var col = 0; col < cols; col++) {
        final index = fireCell(col, row, rows, step);
        if (index < 0) continue;
        canvas.drawRect(
          Rect.fromLTWH(
            col * fireCellSize.toDouble(),
            row * fireCellSize.toDouble(),
            fireCellSize - 1,
            fireCellSize - 1,
          ),
          paint..color = firePalette[index],
        );
      }
    }
  }

  @override
  bool shouldRepaint(_FirePainter old) => old.step != step;
}

// ------------------------------------------------------------------------------------ list

class _Row {
  const _Row(this.stop, this.name, this.tier);
  final LadderStop stop;
  final String name, tier;
}

class _ModelList extends StatefulWidget {
  const _ModelList({
    required this.items,
    required this.tiers,
    required this.selectedId,
    required this.copy,
    required this.onBack,
    required this.onPick,
  });
  final List<LadderStop> items;

  /// Ladder rungs, so catalog rows on the ladder show their tier.
  final List<LadderStop> tiers;
  final String selectedId;
  final LadderCopy copy;
  final VoidCallback onBack;
  final ValueChanged<String> onPick;

  @override
  State<_ModelList> createState() => _ModelListState();
}

class _ModelListState extends State<_ModelList> {
  String _query = '';
  final _search = FocusNode(debugLabel: 'ladder search');
  final _options = <String, FocusNode>{};
  late String _activeId = widget.selectedId;

  FocusNode _option(String id) =>
      _options.putIfAbsent(id, () => FocusNode(debugLabel: 'ladder $id'));

  @override
  void initState() {
    super.initState();
    SchedulerBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (widget.items.length > 6) {
        _search.requestFocus();
        return;
      }
      final rows = _rows();
      final id = rows.any((r) => r.stop.modelId == widget.selectedId)
          ? widget.selectedId
          : (rows.isEmpty ? null : rows.first.stop.modelId);
      if (id != null) _focusId(id);
    });
  }

  @override
  void dispose() {
    _search.dispose();
    for (final node in _options.values) {
      node.dispose();
    }
    super.dispose();
  }

  List<_Row> _rows() {
    final copy = widget.copy;
    final q = _query.trim().toLowerCase();
    final count = widget.items.length;
    final rows = <_Row>[];
    for (var i = 0; i < widget.items.length; i++) {
      final stop = widget.items[i];
      final rung = widget.tiers.indexWhere(
        (row) => row.modelId == stop.modelId,
      );
      final tier = rung >= 0
          ? visibleLabel(widget.tiers[rung], rung, widget.tiers.length, copy)
          : '';
      final row = _Row(
        stop,
        displayName(stop, i, count, copy),
        tier.toLowerCase() == stop.access?.name ? '' : tier,
      );
      if (q.isEmpty ||
          row.name.toLowerCase().contains(q) ||
          row.tier.toLowerCase().contains(q) ||
          stop.modelId.toLowerCase().contains(q) ||
          (stop.description ?? '').toLowerCase().contains(q)) {
        rows.add(row);
      }
    }
    return rows;
  }

  void _focusId(String id) {
    setState(() => _activeId = id);
    final node = _option(id);
    node.requestFocus();
    final target = node.context;
    if (target != null) {
      Scrollable.ensureVisible(
        target,
        alignmentPolicy: ScrollPositionAlignmentPolicy.keepVisibleAtEnd,
      );
      Scrollable.ensureVisible(
        target,
        alignmentPolicy: ScrollPositionAlignmentPolicy.keepVisibleAtStart,
      );
    }
  }

  KeyEventResult _navigate(List<_Row> rows, String? tabStop, KeyEvent event) {
    if (rows.isEmpty || (event is! KeyDownEvent && event is! KeyRepeatEvent)) {
      return KeyEventResult.ignored;
    }
    final index = math.max(
      0,
      rows.indexWhere((row) => row.stop.modelId == tabStop),
    );
    final key = event.logicalKey;
    final int next;
    if (key == LogicalKeyboardKey.arrowDown) {
      next = (index + 1) % rows.length;
    } else if (key == LogicalKeyboardKey.arrowUp) {
      next = (index - 1 + rows.length) % rows.length;
    } else if (key == LogicalKeyboardKey.home) {
      next = 0;
    } else if (key == LogicalKeyboardKey.end) {
      next = rows.length - 1;
    } else {
      return KeyEventResult.ignored;
    }
    _focusId(rows[next].stop.modelId);
    return KeyEventResult.handled;
  }

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final s = theme.sizes;
    final i18n = I18n.of(context);
    final copy = widget.copy;
    final rows = _rows();
    final tabStop = rows.any((row) => row.stop.modelId == _activeId)
        ? _activeId
        : (rows
                  .where((row) => row.stop.modelId == widget.selectedId)
                  .firstOrNull
                  ?.stop
                  .modelId ??
              rows.firstOrNull?.stop.modelId);
    final rtl = Directionality.of(context) == TextDirection.rtl;
    final tools = SizedBox(
      width: double.infinity,
      child: DecoratedBox(
        decoration: ShapeDecoration(
          color: c.surface,
          shape: SuperellipseBorder(radius: s.radiusControl),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          spacing: 8,
          children: [
            ConstrainedBox(
              constraints: BoxConstraints(minHeight: s.controlHeight),
              child: Row(
                spacing: 8,
                children: [
                  Button(
                    variant: ButtonVariant.elevated,
                    controlSize: ControlSize.icon,
                    ariaLabel: copy.back,
                    onClick: widget.onBack,
                    children: [
                      Transform.flip(
                        flipX: rtl,
                        child: const LucideArrowLeft(size: 20),
                      ),
                    ],
                  ),
                  Flexible(
                    child: Semantics(
                      header: true,
                      child: Text(
                        copy.pickModel,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            if (widget.items.length > 6)
              // The search opens with the list (it is the point of a long list) and takes the
              // keyboard; arrows move into the options.
              SizedBox(
                width: double.infinity,
                child: ToolbarSearch(
                  label: copy.searchModels,
                  value: _query,
                  onValueChange: (value) => setState(() => _query = value),
                  defaultExpanded: true,
                  inputRef: _search,
                  onInputKeyDown: (event) {
                    if (event is! KeyDownEvent ||
                        rows.isEmpty ||
                        (event.logicalKey != LogicalKeyboardKey.arrowDown &&
                            event.logicalKey != LogicalKeyboardKey.arrowUp)) {
                      return KeyEventResult.ignored;
                    }
                    final down =
                        event.logicalKey == LogicalKeyboardKey.arrowDown;
                    _focusId(
                      down ? rows.first.stop.modelId : rows.last.stop.modelId,
                    );
                    return KeyEventResult.handled;
                  },
                ),
              ),
          ],
        ),
      ),
    );
    final options = Focus(
      canRequestFocus: false,
      skipTraversal: true,
      onKeyEvent: (_, event) => _navigate(rows, tabStop, event),
      child: Semantics(
        label: copy.pickModel,
        container: true,
        explicitChildNodes: true,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          spacing: 2,
          children: [
            if (rows.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
                child: Text(
                  copy.noMatches,
                  style: TextStyle(fontSize: 12, color: c.muted),
                ),
              ),
            for (final row in rows)
              _OptionRow(
                row: row,
                selected: row.stop.modelId == widget.selectedId,
                // Roving tab stop: only the active option is in the Tab order.
                focusNode: _option(row.stop.modelId)
                  ..skipTraversal = row.stop.modelId != tabStop,
                accessLabel: row.stop.access == null
                    ? null
                    : row.stop.access == LadderAccess.free
                    ? i18n.t('lab.common.free')
                    : i18n.t('lab.common.pro'),
                onFocus: () => setState(() => _activeId = row.stop.modelId),
                onTap: () => widget.onPick(row.stop.modelId),
              ),
          ],
        ),
      ),
    );
    return Focus(
      canRequestFocus: false,
      skipTraversal: true,
      onKeyEvent: (_, event) {
        if (event is KeyDownEvent &&
            event.logicalKey == LogicalKeyboardKey.escape) {
          widget.onBack();
          return KeyEventResult.handled;
        }
        return KeyEventResult.ignored;
      },
      child: MediaQuery.removePadding(
        context: context,
        removeTop: true,
        removeBottom: true,
        removeLeft: true,
        removeRight: true,
        child: ScrollArea(
          label: copy.pickModel,
          edgeGap: 12,
          contentPadding: 12,
          surface: c.surface,
          radius: s.radiusGroup,
          top: tools,
          child: options,
        ),
      ),
    );
  }
}

class _OptionRow extends StatelessWidget {
  const _OptionRow({
    required this.row,
    required this.selected,
    required this.focusNode,
    required this.accessLabel,
    required this.onFocus,
    required this.onTap,
  });
  final _Row row;
  final bool selected;
  final FocusNode focusNode;
  final String? accessLabel;
  final VoidCallback onFocus, onTap;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final stop = row.stop;
    final showTier = row.tier.isNotEmpty && row.tier != row.name;
    final description = stop.description;
    final small = [
      if (showTier) row.tier,
      if (description != null && description.isNotEmpty) description,
    ].join(' · ');
    final price = stop.priceUsd;
    return Focus(
      canRequestFocus: false,
      skipTraversal: true,
      onFocusChange: (focused) {
        if (focused) onFocus();
      },
      child: _LadderControl(
        onTap: onTap,
        focusNode: focusNode,
        selected: selected,
        label: null,
        height: theme.sizes.controlHeight,
        radius: 14,
        padding: const EdgeInsetsDirectional.symmetric(
          horizontal: 10,
          vertical: 9,
        ),
        fill: selected ? mixSrgb(c.primary, 0.16, transparent) : transparent,
        hover: c.controlHover,
        pressed: c.controlPressed,
        edge: transparent,
        child: Row(
          spacing: 10,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                spacing: 2,
                children: [
                  Text(
                    row.name,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      height: 18 / 13,
                      leadingDistribution: TextLeadingDistribution.even,
                    ),
                  ),
                  if (small.isNotEmpty)
                    Text(
                      small,
                      style: TextStyle(
                        fontSize: 11,
                        height: 15 / 11,
                        leadingDistribution: TextLeadingDistribution.even,
                        color: c.muted,
                      ),
                    ),
                ],
              ),
            ),
            if (accessLabel != null)
              _AccessBadge(access: stop.access!, label: accessLabel!),
            if (price != null && price != 0 && stop.access != LadderAccess.free)
              Text(
                formatUsd(price),
                softWrap: false,
                style: TextStyle(fontSize: 11, color: c.muted),
              ),
            if (selected) LucideCheck(size: 18, color: c.primary),
          ],
        ),
      ),
    );
  }
}

// --------------------------------------------------------------------------------- control

/// A `.lab-control` with the ladder's overrides: its own fills, corners and padding, a 1px edge,
/// the pressed inset shadow, the keyboard focus ring, and 0.42 opacity when disabled.
class _LadderControl extends StatefulWidget {
  const _LadderControl({
    required this.onTap,
    this.disabled = false,
    this.focusNode,
    required this.label,
    this.expanded,
    this.selected,
    required this.height,
    this.width,
    required this.radius,
    required this.padding,
    this.bordered = false,
    required this.fill,
    required this.hover,
    required this.pressed,
    required this.edge,
    required this.child,
  });
  final VoidCallback? onTap;

  /// Whether the control keeps the kit's 1px (border-box) border; the ladder's title, reset and
  /// options set `border: 0`.
  final bool bordered;
  final bool disabled;
  final FocusNode? focusNode;
  final String? label;
  final bool? expanded, selected;

  /// Minimum height (the control grows with wrapping content); [width] fixes the width.
  final double height;
  final double? width;
  final double radius;

  /// Padding inside the border.
  final EdgeInsetsDirectional padding;
  final Color fill, hover, pressed, edge;
  final Widget child;

  @override
  State<_LadderControl> createState() => _LadderControlState();
}

class _LadderControlState extends State<_LadderControl> {
  bool _hovered = false, _down = false, _focusVisible = false;

  bool get _interactive => !widget.disabled && widget.onTap != null;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final fill = _interactive && _down
        ? widget.pressed
        : _interactive && (_hovered || _focusVisible)
        ? widget.hover
        : widget.fill;
    final content = ConstrainedBox(
      constraints: BoxConstraints(
        minHeight: widget.height,
        minWidth: widget.width ?? 0,
        maxWidth: widget.width ?? double.infinity,
      ),
      child: Padding(
        padding: widget.bordered
            ? widget.padding.add(const EdgeInsets.all(1))
            : widget.padding,
        child: IconTheme.merge(
          data: IconThemeData(size: 18, color: c.ink),
          child: LucideStroke(
            width: 1.75,
            child: DefaultTextStyle.merge(
              style: TextStyle(
                fontSize: theme.sizes.controlFont,
                height:
                    SizeTokens.controlLine(theme.sizes.controlFont) /
                    theme.sizes.controlFont,
                leadingDistribution: TextLeadingDistribution.even,
                color: c.ink,
              ),
              child: Align(
                alignment: AlignmentDirectional.centerStart,
                widthFactor: 1,
                heightFactor: 1,
                child: widget.child,
              ),
            ),
          ),
        ),
      ),
    );
    return Semantics(
      container: true,
      button: true,
      enabled: _interactive,
      expanded: widget.expanded,
      selected: widget.selected,
      label: widget.label,
      child: FocusableActionDetector(
        focusNode: widget.focusNode,
        enabled: !widget.disabled,
        mouseCursor: _interactive
            ? SystemMouseCursors.click
            : SystemMouseCursors.forbidden,
        onShowHoverHighlight: (value) => setState(() => _hovered = value),
        onShowFocusHighlight: (value) => setState(() => _focusVisible = value),
        actions: {
          ActivateIntent: CallbackAction<ActivateIntent>(
            onInvoke: (_) => _interactive ? widget.onTap!() : null,
          ),
        },
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTapDown: _interactive ? (_) => setState(() => _down = true) : null,
          onTapUp: _interactive ? (_) => setState(() => _down = false) : null,
          onTapCancel: _interactive
              ? () => setState(() => _down = false)
              : null,
          onTap: _interactive ? widget.onTap : null,
          child: AnimatedOpacity(
            opacity: widget.disabled ? 0.42 : 1,
            duration: MotionTokens.durationFast,
            child: TweenAnimationBuilder<Color?>(
              tween: ColorTween(end: fill),
              duration: MotionTokens.durationFast,
              curve: MotionTokens.ease,
              builder: (context, animated, child) => CustomPaint(
                painter: _ControlPainter(
                  fill: animated ?? fill,
                  edge: widget.edge,
                  radius: widget.radius,
                  pressed: _interactive && _down,
                  focus: _focusVisible ? FocusRingStyle.of(context) : null,
                ),
                child: child,
              ),
              child: content,
            ),
          ),
        ),
      ),
    );
  }
}

class _ControlPainter extends CustomPainter {
  _ControlPainter({
    required this.fill,
    required this.edge,
    required this.radius,
    required this.pressed,
    required this.focus,
  });
  final Color fill, edge;
  final double radius;
  final bool pressed;
  final FocusRingStyle? focus;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final radii = [radius, radius, radius, radius];
    canvas.drawPath(superellipsePath(rect, radii), Paint()..color = fill);
    if (pressed) {
      // inset 0 1px 2px rgb(0 0 0 / 10%), inside the border.
      final inner = superellipsePath(rect, radii, inset: 1);
      canvas.save();
      canvas.clipPath(inner);
      canvas.drawPath(
        Path.combine(
          PathOperation.difference,
          Path()..addRect(rect.inflate(8)),
          inner.shift(const Offset(0, 1)),
        ),
        Paint()
          ..color = const Color.from(alpha: 0.10, red: 0, green: 0, blue: 0)
          ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 1),
      );
      canvas.restore();
    }
    if (edge.a > 0) {
      canvas.drawPath(
        superellipsePath(rect, radii, inset: 0.5),
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1
          ..color = edge,
      );
    }
    if (focus != null) paintFocusRing(canvas, rect, radius, focus!);
  }

  @override
  bool shouldRepaint(_ControlPainter old) =>
      old.fill != fill ||
      old.edge != edge ||
      old.radius != radius ||
      old.pressed != pressed ||
      old.focus != focus;
}
