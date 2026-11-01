import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/widgets.dart';

import '../brand/geometry.dart';
import '../i18n/i18n.dart';
import '../icons/lucide.dart';
import '../physics/motion_value.dart';
import '../physics/spring.dart';
import '../primitives/button.dart';
import '../scroll/scroll_area.dart';
import '../theme.dart';
import '../theme/css_text.dart';
import '../theme/tokens.dart';
import '../toolbar.dart';
import '../workspace/scaffold.dart';
import 'stack_model.dart';

/// What a page inside a [NavigationStack] knows about its place in it: the twin of
/// `NavigationStackPage` from `useNavigationStack()`.
@immutable
class NavigationStackPage {
  const NavigationStackPage({
    required this.depth,
    required this.isTop,
    required this.canGoBack,
    required this.back,
    this.previousTitle,
  });

  /// Distance from the root page; 0 for the root.
  final int depth;

  /// True for the page on top, the one people see and use.
  final bool isTop;

  /// True when there is a page to go back to.
  final bool canGoBack;

  /// Goes back: the stack calls its `onBack`, which removes this page.
  final VoidCallback back;

  /// Title of the page underneath, shown by the back button.
  final String? previousTitle;

  @override
  bool operator ==(Object other) =>
      other is NavigationStackPage &&
      other.depth == depth &&
      other.isTop == isTop &&
      other.canGoBack == canGoBack &&
      other.back == back &&
      other.previousTitle == previousTitle;

  @override
  int get hashCode => Object.hash(depth, isTop, canGoBack, back, previousTitle);
}

void _noop() {}

const _rootPage = NavigationStackPage(
  depth: 0,
  isTop: true,
  canGoBack: false,
  back: _noop,
);

/// Path state for a stack: a list of route values, root page not included. Map it to pages and
/// pass [pop] as the stack's `onBack`. The twin of `useNavigationPath()`; listen to it (for
/// example with a ListenableBuilder) to rebuild the stack.
class NavigationPath<T> extends ChangeNotifier {
  NavigationPath([List<T> initial = const []]) : _path = List.of(initial);

  List<T> _path;

  /// The current routes, root first (unmodifiable).
  List<T> get path => List.unmodifiable(_path);

  /// Replaces the whole path.
  set path(List<T> value) {
    _path = List.of(value);
    notifyListeners();
  }

  /// Pushes [route] on top.
  void push(T route) => path = [..._path, route];

  /// Removes the top [count] routes.
  void pop([int count = 1]) =>
      path = _path.sublist(0, math.max(0, _path.length - count));

  /// Removes every route.
  void popToRoot() => path = const [];

  /// Replaces the top route with [route] (pushes it on an empty path).
  void replace(T route) =>
      path = [..._path.sublist(0, math.max(0, _path.length - 1)), route];
}

/// Swipe back with a finger or pen: from anywhere on the page (`content`, like iOS 26), only from
/// the leading edge (`edge`), or `off`. A mouse can always drag from the leading edge.
enum SwipeBack { content, edge, off }

/// How a large page title shows: in the content, collapsing into the bar (`large`), or in the bar.
enum TitleDisplay { large, inline }

enum _Style { slide, zoom, fade }

enum _Kind { push, pop, replace }

class _Transition {
  const _Transition({
    required this.serial,
    required this.kind,
    required this.front,
    required this.back,
    required this.from,
    required this.to,
    required this.animated,
    required this.style,
  });
  final int serial;
  final _Kind kind;

  /// The page on top while moving: the one arriving (push, replace) or leaving (pop).
  final Key front;
  final Key? back;
  final double from, to;
  final bool animated;
  final _Style style;
}

/// What the stack paints on one page host (the inline styles the web kit writes).
class _HostPaint {
  Offset translate = Offset.zero;
  double scale = 1;
  double? clipBottom;
  double clipRadius = 0;
  double opacity = 1;
  double dim = 0;
}

/// Marks the element a page pushed with `zoomSource: id` grows out of (the web kit's
/// `data-lab-zoom-source` attribute). Put it on the page below; it hides while its page is shown.
class ZoomSource extends StatefulWidget {
  const ZoomSource({
    super.key,
    required this.id,
    this.radius = 12,
    required this.child,
  });

  /// Matches the pushed page's `zoomSource`.
  final String id;

  /// Corner radius the zoom starts from (the web kit reads the element's border radius).
  final double radius;
  final Widget child;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(StringProperty('id', id))
      ..add(DoubleProperty('radius', radius, defaultValue: 12.0));
  }

  @override
  State<ZoomSource> createState() => _ZoomSourceState();
}

class _ZoomSourceState extends State<ZoomSource> {
  final opacity = ValueNotifier<double>(1);
  _PageScope? _scope;
  bool hidden = false;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(DoubleProperty('opacity', opacity.value, defaultValue: 1.0))
      ..add(FlagProperty('hidden', value: hidden, ifTrue: 'hidden'))
      ..add(
        FlagProperty(
          'registered',
          value: _scope != null,
          ifFalse: 'outside a stack',
        ),
      );
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final scope = context.dependOnInheritedWidgetOfExactType<_PageScope>();
    final old = _scope;
    if (scope?.hooks != old?.hooks || scope?.pageKey != old?.pageKey) {
      old?.hooks.removeSource(old.pageKey, this);
      scope?.hooks.addSource(scope.pageKey, this);
    }
    _scope = scope;
  }

  @override
  void dispose() {
    _scope?.hooks.removeSource(_scope!.pageKey, this);
    opacity.dispose();
    super.dispose();
  }

  void restore() {
    hidden = false;
    opacity.value = 1;
  }

  @override
  Widget build(BuildContext context) => ValueListenableBuilder<double>(
    valueListenable: opacity,
    builder: (context, value, child) => Opacity(opacity: value, child: child),
    child: widget.child,
  );
}

/// What a stack shares with its pages beyond [NavigationStackPage]: title focus and zoom sources.
abstract class _StackHooks {
  void registerTitle(Key page, FocusNode? node);
  void addSource(Key page, _ZoomSourceState source);
  void removeSource(Key page, _ZoomSourceState source);
}

class _PageScope extends InheritedWidget {
  const _PageScope({
    required this.page,
    required this.pageKey,
    required this.hooks,
    required this.stackWidth,
    required super.child,
  });
  final NavigationStackPage page;
  final Key pageKey;
  final _StackHooks hooks;
  final double stackWidth;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(IntProperty('depth', page.depth))
      ..add(FlagProperty('isTop', value: page.isTop, ifTrue: 'top'))
      ..add(
        FlagProperty('canGoBack', value: page.canGoBack, ifTrue: 'can go back'),
      )
      ..add(
        StringProperty('previousTitle', page.previousTitle, defaultValue: null),
      )
      ..add(DiagnosticsProperty<Key>('pageKey', pageKey))
      ..add(DiagnosticsProperty<_StackHooks>('hooks', hooks))
      ..add(DoubleProperty('stackWidth', stackWidth, unit: 'px'));
  }

  @override
  bool updateShouldNotify(_PageScope old) =>
      old.page != page ||
      old.pageKey != pageKey ||
      old.hooks != hooks ||
      old.stackWidth != stackWidth;
}

/// Push-and-pop page navigation, like iOS: the twin of `NavigationStack` in
/// `@feeef.dev/ui/containers`. A pushed page slides in over the current one, which moves back
/// with a parallax and dims; going back reverses it. Swiping toward the trailing edge drags the
/// page back with the finger and finishes or cancels from the release velocity. A page pushed
/// with `zoomSource` grows out of that [ZoomSource] instead and can be dragged down to shrink back
/// into it. Every page stays mounted, so scroll positions and drafts survive.
class NavigationStack extends StatefulWidget {
  const NavigationStack({
    super.key,
    required this.children,
    this.onBack,
    this.swipeBack = SwipeBack.content,
    this.label = 'Pages',
  });

  /// The pages, root first, each keyed (usually NavigationPages). Append a page to push it;
  /// remove the top one to pop. The stack animates whatever changed.
  final List<Widget> children;

  /// The person went back (back button or swipe). Remove the top page in response.
  final VoidCallback? onBack;

  /// Where a swipe back can start.
  final SwipeBack swipeBack;

  /// Accessible name of the stack region.
  final String label;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(ObjectFlagProperty<VoidCallback?>.has('onBack', onBack))
      ..add(
        EnumProperty<SwipeBack>(
          'swipeBack',
          swipeBack,
          defaultValue: SwipeBack.content,
        ),
      )
      ..add(StringProperty('label', label, defaultValue: 'Pages'));
  }

  /// The nearest stack page's position and `back()`; outside a stack, a root page that cannot go
  /// back. The twin of `useNavigationStack()`.
  static NavigationStackPage of(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<_PageScope>()?.page ??
      _rootPage;

  @override
  State<NavigationStack> createState() => _NavigationStackState();
}

Key _keyOf(Widget widget, int index) => widget.key ?? ValueKey('#$index');

String? _titleOf(Widget? widget) =>
    widget is NavigationPage ? widget.backTitle ?? widget.title : null;

class _Session {
  _Session({
    required this.key,
    required this.back,
    required this.style,
    required this.axis,
    required this.sign,
    required this.page,
    required this.origin,
  }) : rect = Offset.zero & page;
  final Key key;
  final Key? back;
  final _Style style;
  final Axis axis;
  final double sign;
  final Size page;

  /// Where the pan was recognized, in stack coordinates (the grabbed point of the page).
  final Offset origin;
  Offset last = Offset.zero;
  final motion = MotionValue(0, 0.0005);
  Rect rect;
  double radius = 0;
}

class _Frame extends ChangeNotifier {
  void paint() => notifyListeners();
}

class _NavigationStackState extends State<NavigationStack>
    implements _StackHooks {
  late List<Key> _keys;
  List<Key> _leaving = [];
  _Transition? _transition;
  Key? _popped;
  final _latched = <Key, Widget>{};

  final _shown = MotionValue(1, 0.0005);
  void Function(double value)? _painter;
  Key? _activeFront;
  final _returnFocus = <Key, FocusNode?>{};
  final _hostFocus = <Key, FocusNode>{};
  final _titleFocus = <Key, FocusNode>{};
  final _sources = <Key, Set<_ZoomSourceState>>{};
  final _scrollTop = <Key, double>{};
  final _pageInfo = <Key, NavigationStackPage>{};
  final _paint = <Key, _HostPaint>{};
  final _moving = <Key>{};
  Key? _front;
  final _frame = _Frame();
  final _rootKey = GlobalKey();
  late final void Function() _unsubscribe;
  Size _size = const Size(1, 1);
  _Session? _session;
  Timer? _restoreTimer;
  bool _inUpdate = false;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    final transition = _transition;
    properties
      ..add(IntProperty('depth', _keys.length - 1))
      ..add(IterableProperty<Key>('pages', _keys))
      ..add(
        IterableProperty<Key>(
          'leaving',
          _leaving,
          level: _leaving.isEmpty ? DiagnosticLevel.fine : DiagnosticLevel.info,
        ),
      )
      ..add(DiagnosticsProperty<Key?>('front', _front, defaultValue: null))
      ..add(
        EnumProperty<_Kind>('transition', transition?.kind, defaultValue: null),
      )
      ..add(
        EnumProperty<_Style>(
          'transitionStyle',
          transition?.style,
          defaultValue: null,
        ),
      )
      ..add(DoubleProperty('shown', _shown.get(), defaultValue: 1.0))
      ..add(
        FlagProperty(
          'swiping',
          value: _session != null,
          ifTrue: 'drag in progress',
        ),
      )
      ..add(DiagnosticsProperty<Size>('size', _size));
  }

  @override
  void initState() {
    super.initState();
    _latch(widget.children);
    _keys = [
      for (var i = 0; i < widget.children.length; i++)
        _keyOf(widget.children[i], i),
    ];
    _unsubscribe = _shown.subscribe((value) {
      final painter = _painter;
      if (painter == null) return;
      painter(value);
      _frame.paint();
    });
  }

  void _latch(List<Widget> pages) {
    for (var i = 0; i < pages.length; i++) {
      _latched[_keyOf(pages[i], i)] = pages[i];
    }
  }

  _Style _styleOf(Key key) {
    final page = _latched[key];
    return page is NavigationPage && page.zoomSource != null
        ? _Style.zoom
        : _Style.slide;
  }

  bool get _reduced => reducedMotionOf(context);
  bool get _rtl => Directionality.of(context) == TextDirection.rtl;

  @override
  void didUpdateWidget(NavigationStack old) {
    super.didUpdateWidget(old);
    _latch(widget.children);
    final keys = [
      for (var i = 0; i < widget.children.length; i++)
        _keyOf(widget.children[i], i),
    ];
    if (listEquals(keys, _keys)) return;
    _inUpdate = true;
    _next(keys);
    final transition = _transition;
    if (transition != null && transition.serial != _ranSerial) {
      _run(transition);
    }
    _inUpdate = false;
  }

  int _ranSerial = 0;

  /// The web kit's `nextState`: classifies the change and records the transition.
  void _next(List<Key> keys) {
    final change = diffStack<Key>(_keys, keys);
    final serial = (_transition?.serial ?? _ranSerial) + 1;
    final popped = _popped;
    _keys = keys;
    _popped = null;
    switch (change) {
      case StackNone():
        return;
      case StackPush(:final enter, :final exit):
        _leaving = [];
        _transition = _Transition(
          serial: serial,
          kind: _Kind.push,
          front: enter,
          back: exit,
          from: 0,
          to: 1,
          animated: exit != null,
          style: _styleOf(enter),
        );
      case StackPop(:final enter, :final exit):
        final swiped = popped == exit;
        _leaving = swiped ? [] : [exit];
        _transition = _Transition(
          serial: serial,
          kind: _Kind.pop,
          front: exit,
          back: enter,
          from: 1,
          to: 0,
          animated: !swiped && enter != null,
          style: _styleOf(exit),
        );
      case StackReplace(:final enter, :final exit):
        _leaving = exit == null ? [] : [exit];
        _transition = _Transition(
          serial: serial,
          kind: _Kind.replace,
          front: enter,
          back: exit,
          from: 0,
          to: 1,
          animated: exit != null,
          style: _Style.fade,
        );
    }
  }

  void _update(VoidCallback fn) {
    if (_inUpdate || !mounted) {
      fn();
    } else {
      setState(fn);
    }
  }

  _HostPaint _paintOf(Key key) => _paint.putIfAbsent(key, _HostPaint.new);

  void _resetHosts() {
    _paint.clear();
    _moving.clear();
    _front = null;
  }

  void _restoreSources(Key? page) {
    if (page == null) return;
    for (final source in _sources[page] ?? const <_ZoomSourceState>{}) {
      if (source.hidden) source.restore();
    }
  }

  FocusNode _focusOf(Key key) => _hostFocus.putIfAbsent(
    key,
    () => FocusNode(debugLabel: 'Navigation page', skipTraversal: true),
  );

  void _focusPage(Key? key) {
    if (key == null) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final node = _titleFocus[key] ?? _hostFocus[key];
      node?.requestFocus();
    });
  }

  /// The element a zoom page grew from, in stack coordinates, or a centered fallback.
  ({_ZoomSourceState? source, Rect rect, double radius}) _zoomSourceOf(
    Key front,
    Key? back,
  ) {
    final page = _latched[front];
    final id = page is NavigationPage ? page.zoomSource : null;
    final root = _rootKey.currentContext?.findRenderObject();
    if (id != null && back != null && root is RenderBox && root.attached) {
      for (final source in _sources[back] ?? const <_ZoomSourceState>{}) {
        if (source.widget.id != id || !source.mounted) continue;
        final box = source.context.findRenderObject();
        if (box is! RenderBox || !box.attached || !box.hasSize) continue;
        final topLeft = box.localToGlobal(Offset.zero, ancestor: root);
        final rect = topLeft & box.size;
        if (rect.width > 0 && rect.bottom > 0 && rect.top < _size.height) {
          return (source: source, rect: rect, radius: source.widget.radius);
        }
      }
    }
    return (
      source: null,
      rect: Rect.fromLTWH(
        _size.width * 0.3,
        _size.height * 0.36,
        _size.width * 0.4,
        _size.height * 0.28,
      ),
      radius: 24,
    );
  }

  void Function(double) _slidePainter(Key front, Key? back) {
    final width = _size.width, mirrored = _rtl;
    return (value) {
      final frame = slideFrame(value, width, mirrored);
      _paintOf(front).translate = Offset(frame.front, 0);
      if (back != null) {
        _paintOf(back)
          ..translate = Offset(frame.back, 0)
          ..dim = frame.dim;
      }
    };
  }

  void Function(double) _fadePainter(Key front) =>
      (value) => _paintOf(front).opacity = value.clamp(0.0, 1.0);

  void _applyZoom(Key key, ZoomFrame frame) {
    _paintOf(key)
      ..translate = frame.translate
      ..scale = frame.scale
      ..clipBottom = frame.clipBottom
      ..clipRadius = frame.clipRadius;
  }

  void Function(double) _zoomPainter(Key front, Key? back) {
    final page = _size;
    final full = Offset.zero & page;
    final source = _zoomSourceOf(front, back);
    source.source?.hidden = true;
    return (value) {
      _applyZoom(
        front,
        zoomFrame(
          mixRect(source.rect, full, value),
          mix(source.radius, 0, value),
          page,
        ),
      );
      final appear = progressBetween(value, 0, 0.22);
      _paintOf(front).opacity = appear;
      source.source?.opacity.value = 1 - appear;
    };
  }

  /// Runs a transition: paints its first frame before the next frame is drawn, then springs.
  void _run(_Transition transition) {
    _ranSerial = transition.serial;
    final front = transition.front;
    final back = transition.back;
    final value = _shown;
    final continuing = _activeFront == front && value.isAnimating;
    if (!continuing) value.stop();
    _resetHosts();
    _painter = null;

    switch (transition.kind) {
      case _Kind.push:
        _returnFocus[front] = FocusManager.instance.primaryFocus;
        _focusPage(front);
      case _Kind.pop:
        final target = _returnFocus.remove(front);
        final host = back == null ? null : _hostFocus[back];
        if (target != null &&
            target.context != null &&
            host != null &&
            host.descendants.contains(target)) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted && target.context != null) target.requestFocus();
          });
        } else {
          _focusPage(back);
        }
      case _Kind.replace:
        _focusPage(front);
    }

    if (!transition.animated) {
      value.set(transition.to);
      _finish(transition);
      return;
    }
    final reduced = _reduced;
    final style = reduced ? _Style.fade : transition.style;
    final fade = motionFade(
      motionOf(context),
      const Duration(milliseconds: 200),
    );
    _moving.add(front);
    _front = front;
    if (back != null) _moving.add(back);
    final paint = switch (style) {
      _Style.zoom => _zoomPainter(front, back),
      _Style.slide => _slidePainter(front, back),
      _Style.fade => _fadePainter(front),
    };
    if (!continuing) value.set(transition.from);
    _activeFront = front;
    _painter = paint;
    paint(value.get());
    _frame.paint();
    value
        .animateTo(
          transition.to,
          spring: reduced
              ? Spring(duration: fade.inMicroseconds / 1e6, bounce: 0)
              : Springs.smooth,
          instant: fade == Duration.zero,
        )
        .then((arrived) {
          if (arrived && mounted) _finish(transition);
        });
  }

  void _finish(_Transition transition) {
    _painter = null;
    _activeFront = null;
    _resetHosts();
    if (transition.kind == _Kind.pop) _restoreSources(transition.back);
    _update(() {
      if (_transition?.serial == transition.serial) {
        _leaving = [];
        _transition = null;
      }
      for (final key in [..._latched.keys]) {
        if (_keys.contains(key)) continue;
        _latched.remove(key);
        _hostFocus.remove(key)?.dispose();
        _scrollTop.remove(key);
        _pageInfo.remove(key);
      }
    });
    _frame.paint();
  }

  // Title focus and zoom sources, registered by pages.
  @override
  void registerTitle(Key page, FocusNode? node) {
    if (node == null) {
      _titleFocus.remove(page);
    } else {
      _titleFocus[page] = node;
    }
  }

  @override
  void addSource(Key page, _ZoomSourceState source) =>
      _sources.putIfAbsent(page, () => {}).add(source);

  @override
  void removeSource(Key page, _ZoomSourceState source) =>
      _sources[page]?.remove(source);

  // Swipe back (x) and, on zoom pages, drag down to dismiss (y).
  Key? get _topKey => _keys.isEmpty ? null : _keys.last;
  bool get _ready =>
      _keys.length > 1 && _transition == null && _session == null;

  RenderBox? get _rootBox {
    final box = _rootKey.currentContext?.findRenderObject();
    return box is RenderBox && box.attached ? box : null;
  }

  bool _allowX(PointerDownEvent event) {
    if (widget.swipeBack == SwipeBack.off || !_ready) return false;
    final box = _rootBox;
    if (box == null) return false;
    final x = box.globalToLocal(event.position).dx;
    final fromEdge = _rtl ? box.size.width - x : x;
    return fromEdge <= 28 ||
        (widget.swipeBack == SwipeBack.content &&
            event.kind != PointerDeviceKind.mouse);
  }

  bool _allowY(PointerDownEvent event) {
    final top = _topKey;
    return widget.swipeBack != SwipeBack.off &&
        _ready &&
        top != null &&
        _styleOf(top) == _Style.zoom &&
        !_reduced;
  }

  /// True while the top page's own scroll view sits at its top, so a downward pull is ours.
  bool _topAtStart() => (_scrollTop[_topKey] ?? 0) <= 1;

  void _start(Axis axis, Offset local) {
    final key = _topKey;
    if (key == null || !_ready) return;
    final back = _keys.length > 1 ? _keys[_keys.length - 2] : null;
    _shown.stop();
    final session = _Session(
      key: key,
      back: back,
      style: _reduced ? _Style.fade : _styleOf(key),
      axis: axis,
      sign: _rtl ? -1 : 1,
      page: _size,
      origin: local,
    );
    _session = session;
    _restoreTimer?.cancel();
    _moving.add(key);
    _front = key;
    if (back != null) _moving.add(back);
    if (session.style == _Style.zoom) {
      _zoomSourceOf(key, back).source?.hidden = true;
    } else {
      _painter = session.style == _Style.slide
          ? _slidePainter(key, back)
          : _fadePainter(key);
    }
    _frame.paint();
  }

  double _pull(_Session s, Offset d) => s.axis == Axis.vertical
      ? d.dy
      : math.max(0, d.dx * s.sign) * 0.7 + math.max(0, d.dy);

  void _move(Offset local) {
    final s = _session;
    if (s == null) return;
    final d = local - s.origin;
    s.last = d;
    if (s.style == _Style.zoom) {
      final pull = _pull(s, d);
      s.rect = dragDismissRect(s.page, s.origin, d.dx, d.dy, pull);
      s.radius = mix(0, 28, progressBetween(pull, 0, 140));
      _applyZoom(s.key, zoomFrame(s.rect, s.radius, s.page));
      _frame.paint();
      return;
    }
    final travel = math.max(0.0, d.dx * s.sign);
    _shown.set(1 - math.min(1, travel / s.page.width));
  }

  void _settle(_Session s) {
    _painter = null;
    _moving
      ..remove(s.key)
      ..remove(s.back);
    if (_front == s.key) _front = null;
    _paint
      ..remove(s.key)
      ..remove(s.back);
    _frame.paint();
  }

  void _poppedBy(_Session s) {
    _update(() => _popped = s.key);
    widget.onBack?.call();
    // If the host keeps the page, bring it back.
    _restoreTimer = Timer(const Duration(milliseconds: 500), () {
      if (!mounted || _topKey != s.key || _transition != null) return;
      if (_popped == s.key) setState(() => _popped = null);
      if (s.style == _Style.zoom) {
        _settle(s);
        return;
      }
      _moving.add(s.key);
      if (s.back != null) _moving.add(s.back!);
      _painter = s.style == _Style.slide
          ? _slidePainter(s.key, s.back)
          : _fadePainter(s.key);
      _shown.animateTo(1, spring: Springs.release).then((done) {
        if (done && mounted) _settle(s);
      });
    });
  }

  /// [velocity] is the release velocity in stack px per second.
  void _end(Offset velocity, bool cancelled) {
    final s = _session;
    _session = null;
    if (s == null) return;
    final d = s.last;
    if (s.style != _Style.zoom) {
      final travel = d.dx * s.sign, speed = velocity.dx * s.sign;
      final complete =
          !cancelled &&
          projectMomentum(travel, speed, 0.99) > s.page.width / 2 &&
          speed > -250;
      // `shown` falls as the page travels: its speed is the pointer's over the page width.
      final shownVelocity = -speed / math.max(1, s.page.width);
      _shown
          .animateTo(
            complete ? 0 : 1,
            spring: Springs.release,
            velocity: cancelled ? 0 : shownVelocity,
          )
          .then((done) {
            if (!done || !mounted) return;
            if (complete) {
              _poppedBy(s);
            } else {
              _settle(s);
            }
          });
      return;
    }
    final pull = _pull(s, d);
    final speed = s.axis == Axis.vertical
        ? velocity.dy
        : math.max(0, velocity.dx * s.sign) * 0.7 + math.max(0, velocity.dy);
    final dismiss =
        !cancelled && projectMomentum(pull, speed, 0.99) > s.page.height * 0.22;
    final from = s.rect, fromRadius = s.radius;
    final source = _zoomSourceOf(s.key, s.back);
    final to = dismiss ? source.rect : Offset.zero & s.page;
    final toRadius = dismiss ? source.radius : 0.0;
    final dx = to.left - from.left, dy = to.top - from.top;
    final distance = math.max(1.0, math.sqrt(dx * dx + dy * dy));
    final toward =
        (velocity.dx * dx + velocity.dy * dy) / (distance * distance);
    final motion = s.motion..set(0);
    final unsubscribe = motion.subscribe((q) {
      _applyZoom(
        s.key,
        zoomFrame(mixRect(from, to, q), mix(fromRadius, toRadius, q), s.page),
      );
      if (dismiss) {
        final fade = progressBetween(q, 0.72, 1);
        _paintOf(s.key).opacity = 1 - fade;
        source.source?.opacity.value = fade;
      }
      _frame.paint();
    });
    motion
        .animateTo(
          1,
          spring: Springs.release,
          velocity: cancelled ? 0 : toward.clamp(0.0, 8.0),
        )
        .then((done) {
          unsubscribe();
          if (!done || !mounted) return;
          if (dismiss) {
            _poppedBy(s);
          } else {
            _settle(s);
          }
        });
  }

  /// Screen px per layout px: below 1 when an ancestor is scaled.
  double _screenScale() {
    final box = _rootBox;
    if (box == null) return 1;
    final scale = box.getTransformTo(null).getMaxScaleOnAxis();
    return scale > 0 ? scale : 1;
  }

  @override
  void dispose() {
    _restoreTimer?.cancel();
    _unsubscribe();
    _shown.stop();
    for (final node in _hostFocus.values) {
      node.dispose();
    }
    _frame.dispose();
    super.dispose();
  }

  void _back() => widget.onBack?.call();

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final dark = theme.brightness == Brightness.dark;
    final top = _keys.isEmpty ? null : _keys.last;
    final order = _transition?.kind == _Kind.replace && _keys.isNotEmpty
        ? [..._keys.sublist(0, _keys.length - 1), ..._leaving, _keys.last]
        : [..._keys, ..._leaving];
    final seen = <Key>{};
    final hosts = <Widget>[];
    return LayoutBuilder(
      builder: (context, constraints) {
        _size = Size(
          constraints.maxWidth.isFinite ? constraints.maxWidth : 1,
          constraints.maxHeight.isFinite ? constraints.maxHeight : 1,
        );
        hosts.clear();
        seen.clear();
        for (final key in order) {
          if (!seen.add(key)) continue;
          final element = _latched[key];
          if (element == null) continue;
          final depth = _keys.indexOf(key);
          final leaving = depth < 0;
          final isTop = key == top && !leaving;
          final previous = depth > 0 ? _latched[_keys[depth - 1]] : null;
          hosts.add(
            _host(
              key: key,
              element: element,
              depth: math.max(0, depth),
              isTop: isTop,
              below: !isTop && !leaving,
              previousTitle: _titleOf(previous),
              surface: theme.colors.surface,
              dimColor: Color.from(
                alpha: dark ? 0.32 : 0.1,
                red: 0,
                green: 0,
                blue: 0,
              ),
              shadow: Color.from(
                alpha: dark ? 0.8 : 0.5,
                red: 0,
                green: 0,
                blue: 0,
              ),
              shadowSpread: dark ? -18 : -20,
            ),
          );
        }
        return Semantics(
          container: true,
          explicitChildNodes: true,
          label: widget.label,
          child: RawGestureDetector(
            key: _rootKey,
            behavior: HitTestBehavior.translucent,
            gestures: {
              _SwipeBackRecognizer:
                  GestureRecognizerFactoryWithHandlers<_SwipeBackRecognizer>(
                    () => _SwipeBackRecognizer(debugOwner: this),
                    (r) => r
                      ..allow = _allowX
                      ..direction = (() => _rtl ? -1.0 : 1.0)
                      ..onStart = ((d) =>
                          _start(Axis.horizontal, d.localPosition))
                      ..onUpdate = ((d) => _move(d.localPosition))
                      ..onEnd = ((d) => _end(
                        d.velocity.pixelsPerSecond / _screenScale(),
                        false,
                      ))
                      ..onCancel = (() => _end(Offset.zero, true)),
                  ),
              _DismissRecognizer:
                  GestureRecognizerFactoryWithHandlers<_DismissRecognizer>(
                    () => _DismissRecognizer(debugOwner: this),
                    (r) => r
                      ..allow = _allowY
                      ..atStart = _topAtStart
                      ..onStart = ((d) =>
                          _start(Axis.vertical, d.localPosition))
                      ..onUpdate = ((d) => _move(d.localPosition))
                      ..onEnd = ((d) => _end(
                        d.velocity.pixelsPerSecond / _screenScale(),
                        false,
                      ))
                      ..onCancel = (() => _end(Offset.zero, true)),
                  ),
            },
            child: ClipRect(
              child: Stack(fit: StackFit.expand, children: hosts),
            ),
          ),
        );
      },
    );
  }

  Widget _host({
    required Key key,
    required Widget element,
    required int depth,
    required bool isTop,
    required bool below,
    required String? previousTitle,
    required Color surface,
    required Color dimColor,
    required Color shadow,
    required double shadowSpread,
  }) {
    final title = element is NavigationPage ? element.title : null;
    // A leaving page keeps what it knew while it animates away (its bar stays as it was).
    final frozen = !isTop && !below ? _pageInfo[key] : null;
    final page = frozen == null
        ? NavigationStackPage(
            depth: depth,
            isTop: isTop,
            canGoBack: depth > 0,
            back: _back,
            previousTitle: previousTitle,
          )
        : NavigationStackPage(
            depth: frozen.depth,
            isTop: false,
            canGoBack: frozen.canGoBack,
            back: _back,
            previousTitle: frozen.previousTitle,
          );
    _pageInfo[key] = page;
    final content = ExcludeSemantics(
      excluding: !isTop,
      child: Semantics(
        container: true,
        explicitChildNodes: true,
        label: title,
        child: Focus(
          focusNode: _focusOf(key),
          skipTraversal: true,
          child: IgnorePointer(
            ignoring: !isTop,
            child: ExcludeFocus(
              excluding: !isTop,
              child: ColoredBox(
                color: surface,
                child: NotificationListener<ScrollNotification>(
                  onNotification: (n) {
                    if (n.depth == 0 && n.metrics.axis == Axis.vertical) {
                      _scrollTop[key] = n.metrics.pixels;
                    }
                    return false;
                  },
                  child: _PageScope(
                    page: page,
                    pageKey: key,
                    hooks: this,
                    stackWidth: _size.width,
                    child: element,
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
    return KeyedSubtree(
      key: ValueKey(('nav-host', key)),
      child: ListenableBuilder(
        listenable: _frame,
        builder: (context, child) {
          final p = _paint[key];
          final moving = _moving.contains(key);
          final front = moving && _front == key;
          final size = _size;
          final clip = p?.clipBottom;
          return Offstage(
            offstage: below && !moving,
            child: Transform(
              transform: Matrix4.translationValues(
                p?.translate.dx ?? 0,
                p?.translate.dy ?? 0,
                0,
              )..scaleByDouble(p?.scale ?? 1, p?.scale ?? 1, 1, 1),
              child: CustomPaint(
                painter: front
                    ? _EdgeShadowPainter(
                        color: shadow,
                        spread: shadowSpread,
                        rtl: _rtl,
                      )
                    : null,
                child: ClipPath(
                  clipBehavior: clip == null ? Clip.none : Clip.antiAlias,
                  clipper: _ZoomClipper(
                    Rect.fromLTWH(
                      0,
                      0,
                      size.width,
                      math.max(0, size.height - (clip ?? 0)),
                    ),
                    p?.clipRadius ?? 0,
                  ),
                  child: Opacity(
                    opacity: p?.opacity ?? 1,
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        child!,
                        Positioned.fill(
                          child: IgnorePointer(
                            child: Opacity(
                              opacity: (p?.dim ?? 0).clamp(0.0, 1.0),
                              child: ColoredBox(color: dimColor),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          );
        },
        child: content,
      ),
    );
  }
}

class _ZoomClipper extends CustomClipper<Path> {
  _ZoomClipper(this.rect, this.radius);
  final Rect rect;
  final double radius;
  @override
  Path getClip(Size size) =>
      superellipsePath(rect, [radius, radius, radius, radius]);
  @override
  bool shouldReclip(_ZoomClipper old) =>
      old.rect != rect || old.radius != radius;
}

/// `--lab-nav-edge-shadow`: `-12px 0 32px -20px` (dark `-18px`), mirrored in RTL. Blur 32 →
/// sigma 16; the negative spread shrinks the box.
class _EdgeShadowPainter extends CustomPainter {
  _EdgeShadowPainter({
    required this.color,
    required this.spread,
    required this.rtl,
  });
  final Color color;
  final double spread;
  final bool rtl;

  @override
  void paint(Canvas canvas, Size size) {
    final box = (Offset.zero & size).inflate(spread);
    if (box.isEmpty) return;
    canvas.drawRect(
      box.shift(Offset(rtl ? 12 : -12, 0)),
      Paint()
        ..color = color
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 16),
    );
  }

  @override
  bool shouldRepaint(_EdgeShadowPainter old) =>
      old.color != color || old.spread != spread || old.rtl != rtl;
}

/// The stack's horizontal pan: only toward the trailing edge (the web kit's `shouldStart`
/// direction check), only for pointers [allow] accepts, never trackpad scrolls.
class _SwipeBackRecognizer extends HorizontalDragGestureRecognizer {
  _SwipeBackRecognizer({super.debugOwner})
    : super(
        supportedDevices: const {
          PointerDeviceKind.touch,
          PointerDeviceKind.mouse,
          PointerDeviceKind.stylus,
          PointerDeviceKind.invertedStylus,
        },
      ) {
    // Alone in the arena a drag would start on contact; wait for the decisive movement.
    onlyAcceptDragOnThreshold = true;
  }

  bool Function(PointerDownEvent event) allow = (_) => false;
  double Function() direction = () => 1;
  Offset _moved = Offset.zero;
  bool _decided = false;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(
        ObjectFlagProperty<bool Function(PointerDownEvent event)>.has(
          'allow',
          allow,
        ),
      )
      ..add(ObjectFlagProperty<double Function()>.has('direction', direction))
      ..add(FlagProperty('decided', value: _decided, ifTrue: 'decided'));
  }

  @override
  bool isPointerAllowed(PointerEvent event) =>
      (event is! PointerDownEvent || allow(event)) &&
      super.isPointerAllowed(event);

  @override
  void addAllowedPointer(PointerDownEvent event) {
    _moved = Offset.zero;
    _decided = false;
    super.addAllowedPointer(event);
  }

  @override
  void handleEvent(PointerEvent event) {
    if (event is PointerMoveEvent && !_decided) {
      _moved += event.delta;
      final slop = computeHitSlop(event.kind, gestureSettings);
      if (_moved.dx.abs() > slop && _moved.dx * direction() < 0) {
        resolve(GestureDisposition.rejected);
        stopTrackingPointer(event.pointer);
        return;
      }
    }
    super.handleEvent(event);
  }

  @override
  bool hasSufficientGlobalDistanceToAccept(
    PointerDeviceKind pointerDeviceKind,
    double? deviceTouchSlop,
  ) => _decided =
      _moved.dx * direction() > 0 &&
      super.hasSufficientGlobalDistanceToAccept(
        pointerDeviceKind,
        deviceTouchSlop,
      );
}

/// The zoom page's downward pan. It claims a pull after 4px while the page's own scroll view is
/// at its top (the web kit's `touch: 'claim'`), before that scroll view takes it.
class _DismissRecognizer extends VerticalDragGestureRecognizer {
  _DismissRecognizer({super.debugOwner})
    : super(
        supportedDevices: const {
          PointerDeviceKind.touch,
          PointerDeviceKind.mouse,
          PointerDeviceKind.stylus,
          PointerDeviceKind.invertedStylus,
        },
      ) {
    // Alone in the arena a drag would start on contact; wait for the decisive movement.
    onlyAcceptDragOnThreshold = true;
  }

  bool Function(PointerDownEvent event) allow = (_) => false;
  bool Function() atStart = () => true;
  Offset _moved = Offset.zero;
  bool _decided = false;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(
        ObjectFlagProperty<bool Function(PointerDownEvent event)>.has(
          'allow',
          allow,
        ),
      )
      ..add(ObjectFlagProperty<bool Function()>.has('atStart', atStart))
      ..add(FlagProperty('decided', value: _decided, ifTrue: 'decided'));
  }

  @override
  bool isPointerAllowed(PointerEvent event) =>
      (event is! PointerDownEvent || allow(event)) &&
      super.isPointerAllowed(event);

  @override
  void addAllowedPointer(PointerDownEvent event) {
    _moved = Offset.zero;
    _decided = false;
    super.addAllowedPointer(event);
  }

  @override
  void handleEvent(PointerEvent event) {
    if (event is PointerMoveEvent && !_decided) {
      _moved += event.delta;
      final upward = _moved.dy < 0 && _moved.dy.abs() >= 4;
      final sideways =
          _moved.distance >= 4 && _moved.dx.abs() > _moved.dy.abs();
      if (upward || sideways || !atStart()) {
        resolve(GestureDisposition.rejected);
        stopTrackingPointer(event.pointer);
        return;
      }
    }
    super.handleEvent(event);
  }

  @override
  bool hasSufficientGlobalDistanceToAccept(
    PointerDeviceKind pointerDeviceKind,
    double? deviceTouchSlop,
  ) => _decided = _moved.dy >= 4 && _moved.dy >= _moved.dx.abs();
}

/// One page of a [NavigationStack]: its own scroll area with a floating glass bar (back button
/// with the previous title, the page title, trailing actions) and an optional bottom dock. A
/// large title scrolls under the bar and reappears in it, like iOS. The twin of `NavigationPage`.
class NavigationPage extends StatefulWidget {
  const NavigationPage({
    super.key,
    required this.title,
    this.titleDisplay,
    this.subtitle,
    this.leading = const [],
    this.trailing,
    this.bottom,
    this.backTitle,
    this.hideBar = false,
    this.zoomSource,
    this.contentPadding,
    this.contentLabel,
    this.child,
  });

  /// Page title: the large title, the bar title once it scrolls away, and the next page's back
  /// label.
  final String title;

  /// `large` shows a big title in the content that collapses into the bar; `inline` shows it in
  /// the bar. Default: large on the root page, inline when pushed.
  final TitleDisplay? titleDisplay;

  /// Shown under the large title.
  final Widget? subtitle;

  /// Extra controls after the back button, in the same glass group.
  final List<Widget> leading;

  /// Controls at the end of the bar; wrap them in a ToolbarGroup.
  final Widget? trailing;

  /// Floats over the bottom, usually a Dock with the page's actions.
  final Widget? bottom;

  /// What the back button of the next page says for this one. Defaults to [title].
  final String? backTitle;

  /// Hides the bar (for full-bleed media pages); the stack's swipe still goes back.
  final bool hideBar;

  /// When pushed, grow out of the [ZoomSource] with this id on the page below.
  final String? zoomSource;

  /// Inline content padding in px (default: the shell gap G).
  final double? contentPadding;

  /// Accessible name of the scrolling content. Defaults to the title.
  final String? contentLabel;
  final Widget? child;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(StringProperty('title', title))
      ..add(
        EnumProperty<TitleDisplay?>(
          'titleDisplay',
          titleDisplay,
          defaultValue: null,
        ),
      )
      ..add(IntProperty('leading', leading.length, defaultValue: 0))
      ..add(StringProperty('backTitle', backTitle, defaultValue: null))
      ..add(
        FlagProperty(
          'hideBar',
          value: hideBar,
          ifTrue: 'bar hidden',
          defaultValue: false,
        ),
      )
      ..add(StringProperty('zoomSource', zoomSource, defaultValue: null))
      ..add(
        DoubleProperty('contentPadding', contentPadding, defaultValue: null),
      )
      ..add(StringProperty('contentLabel', contentLabel, defaultValue: null));
  }

  @override
  State<NavigationPage> createState() => _NavigationPageState();
}

class _NavigationPageState extends State<NavigationPage> {
  final _controller = ScrollController();
  final _bar = GlobalKey();
  final _heading = GlobalKey();
  final _area = GlobalKey();
  final _titleNode = FocusNode(debugLabel: 'Page title', skipTraversal: true);
  bool _collapsed = false;
  _PageScope? _scope;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties.add(
      FlagProperty('collapsed', value: _collapsed, ifTrue: 'title in bar'),
    );
  }

  @override
  void initState() {
    super.initState();
    _controller.addListener(_measure);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final scope = context.dependOnInheritedWidgetOfExactType<_PageScope>();
    if (scope?.hooks != _scope?.hooks || scope?.pageKey != _scope?.pageKey) {
      _scope?.hooks.registerTitle(_scope!.pageKey, null);
    }
    _scope = scope;
    scope?.hooks.registerTitle(scope.pageKey, _titleNode);
  }

  @override
  void dispose() {
    _scope?.hooks.registerTitle(_scope!.pageKey, null);
    _controller.dispose();
    _titleNode.dispose();
    super.dispose();
  }

  TitleDisplay get _display =>
      widget.titleDisplay ??
      (NavigationStack.of(context).depth == 0
          ? TitleDisplay.large
          : TitleDisplay.inline);

  void _measure() {
    if (!mounted || _display != TitleDisplay.large) return;
    final title = _heading.currentContext?.findRenderObject();
    if (title is! RenderBox || !title.attached || !title.hasSize) return;
    final bottom = title.localToGlobal(Offset(0, title.size.height)).dy;
    final bar = _bar.currentContext?.findRenderObject();
    final area = _area.currentContext?.findRenderObject();
    double line;
    if (bar is RenderBox && bar.attached && bar.hasSize) {
      line = bar.localToGlobal(Offset(0, bar.size.height)).dy;
    } else if (area is RenderBox && area.attached) {
      line = area.localToGlobal(Offset.zero).dy;
    } else {
      return;
    }
    final collapsed = bottom <= line + 2;
    if (collapsed != _collapsed) setState(() => _collapsed = collapsed);
  }

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final page = NavigationStack.of(context);
    final display = _display;
    final stackWidth =
        _scope?.stackWidth ?? MediaQuery.maybeSizeOf(context)?.width ?? 1000;
    final rtl = Directionality.of(context) == TextDirection.rtl;
    // The bar's reservation and the title's place change after layout: measure every frame built.
    WidgetsBinding.instance.addPostFrameCallback((_) => _measure());
    final titleShown = display == TitleDisplay.inline || _collapsed;
    final previous = page.previousTitle;
    final backLabel = previous != null
        ? I18n.of(context).t('lab.nav.backTo', {'title': previous})
        : I18n.of(context).t('lab.nav.back');
    final narrow = stackWidth <= 560;
    Widget? header;
    if (!widget.hideBar) {
      final heading = DefaultTextStyle.merge(
        style: const TextStyle(
          fontSize: 15,
          height: 20 / 15,
          leadingDistribution: TextLeadingDistribution.even,
          fontWeight: FontWeight.w600,
        ),
        maxLines: 1,
        softWrap: false,
        overflow: TextOverflow.ellipsis,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10),
          child: CssBaseline(lineHeight: 20, child: Text(widget.title)),
        ),
      );
      header = ScaffoldAppBar(
        leading: page.canGoBack || widget.leading.isNotEmpty
            ? ToolbarGroup(
                label: 'Navigation',
                children: [
                  if (page.canGoBack)
                    ConstrainedBox(
                      constraints: BoxConstraints(
                        maxWidth: math.min(240, stackWidth * 0.4),
                      ),
                      child: Button(
                        variant: ButtonVariant.text,
                        appearance: ButtonAppearance.toolbar,
                        // .lab-nav-back: 6px 12px with a 2px gap; 8px each side when narrow.
                        padding: narrow
                            ? const EdgeInsetsDirectional.symmetric(
                                horizontal: 8,
                              )
                            : const EdgeInsetsDirectional.only(
                                start: 6,
                                end: 12,
                              ),
                        gap: 2,
                        ariaLabel: backLabel,
                        onClick: page.back,
                        children: [
                          Transform.flip(
                            flipX: rtl,
                            child: const LucideChevronLeft(),
                          ),
                          if (!narrow)
                            Flexible(
                              child: ExcludeSemantics(
                                child: Text(
                                  previous ??
                                      I18n.of(context).t('lab.nav.back'),
                                  maxLines: 1,
                                  softWrap: false,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ...widget.leading,
                ],
              )
            : null,
        trailing: widget.trailing,
        child: _BarTitle(
          shown: titleShown,
          child: ToolbarGroup(
            label: 'Page title',
            // Hidden titles leave the bar's shared glass but keep their place, as on the web.
            glassHidden: !titleShown,
            children: [
              // A long title ellipsizes beside the back button and actions.
              Flexible(
                child: display == TitleDisplay.inline
                    ? Focus(
                        focusNode: _titleNode,
                        skipTraversal: true,
                        child: Semantics(header: true, child: heading),
                      )
                    : ExcludeSemantics(child: heading),
              ),
            ],
          ),
        ),
      );
    }
    final large = display == TitleDisplay.large
        ? Padding(
            padding: const EdgeInsets.only(top: 4, bottom: 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              spacing: 6,
              children: [
                Focus(
                  focusNode: _titleNode,
                  skipTraversal: true,
                  child: Semantics(
                    header: true,
                    child: Builder(
                      builder: (context) {
                        final size = (stackWidth * 0.06).clamp(28.0, 34.0);
                        return Text(
                          widget.title,
                          key: _heading,
                          style: TextStyle(
                            fontSize: size,
                            // `line-height: round(1.15em, 1px)`.
                            height: (size * 1.15).roundToDouble() / size,
                            leadingDistribution: TextLeadingDistribution.even,
                            fontWeight: FontWeight.w600,
                            letterSpacing: size * -0.015,
                            color: c.ink,
                          ),
                        );
                      },
                    ),
                  ),
                ),
                if (widget.subtitle != null)
                  DefaultTextStyle.merge(
                    style: TextStyle(
                      color: c.muted,
                      fontSize: 15,
                      height: 22 / 15,
                      leadingDistribution: TextLeadingDistribution.even,
                    ),
                    child: widget.subtitle!,
                  ),
              ],
            ),
          )
        : null;
    return KeyedSubtree(
      key: _area,
      child: ScrollArea(
        label: widget.contentLabel ?? widget.title,
        controller: _controller,
        contentPadding: widget.contentPadding,
        top: header == null
            ? null
            : SizedBox(key: _bar, width: double.infinity, child: header),
        bottom: widget.bottom,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [?large, ?widget.child],
        ),
      ),
    );
  }
}

/// The bar's title bubble: present only while shown (the web kit hides its glass with
/// `data-glass-hidden`), fading in and rising 6px over 220ms. While hidden it keeps its height so
/// the bar's reservation does not jump.
class _BarTitle extends StatelessWidget {
  const _BarTitle({required this.shown, required this.child});
  final bool shown;
  final Widget child;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties.add(
      FlagProperty('shown', value: shown, ifTrue: 'shown', ifFalse: 'hidden'),
    );
  }

  /// `.lab-nav-bar-title`: fades and drops 6px while hidden, over the normal duration.
  @override
  Widget build(BuildContext context) {
    final reduced = reducedMotionOf(context);
    return IgnorePointer(
      ignoring: !shown,
      child: TweenAnimationBuilder<double>(
        tween: Tween(end: shown ? 1 : 0),
        duration: reduced ? Duration.zero : MotionTokens.durationNormal,
        builder: (context, t, child) => Opacity(
          opacity: MotionTokens.ease.transform(t.clamp(0, 1)),
          child: Transform.translate(
            offset: Offset(
              0,
              6 * (1 - MotionTokens.easeOut.transform(t.clamp(0, 1))),
            ),
            child: child,
          ),
        ),
        child: ExcludeSemantics(excluding: !shown, child: child),
      ),
    );
  }
}
