import 'package:flutter/gestures.dart' show HitTestTarget;
import 'package:flutter/rendering.dart';
import 'package:flutter/widgets.dart';

import '../theme.dart';
import 'lens_model.dart';

/// Gives a control smaller than [minSize] an invisible hit area of at least [minSize] ×
/// [minSize] around it on touch screens, without changing layout: the control keeps its visual
/// size (a 36px iOS button stays 36px on a phone) and a finger that lands just outside it still
/// presses it. The twin of the web kit's coarse-pointer `::before` hit area (`system.css`).
///
/// Flutter only hit-tests inside each ancestor's bounds, so the reach is resolved by the nearest
/// [TouchTargetScope] (the root [ThemeProvider] installs one): a press that misses every control
/// but lands within a control's reach is given to the nearest such control, as long as nothing is
/// drawn over that control (a dialog, another route). Buttons, icon buttons, chips, switches,
/// segmented options, checkboxes and radios use it; wrap a custom control's gesture detector in one
/// to give it the same reach.
class TouchTarget extends SingleChildRenderObjectWidget {
  const TouchTarget({super.key, this.minSize, required super.child});

  /// The smallest hit area (px); null takes the theme's touch target (44). A host whose own
  /// surface is the target (a toolbar bubble) passes its control height, so nothing reaches out.
  final double? minSize;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties.add(DoubleProperty('minSize', minSize, defaultValue: null));
  }

  double _extent(BuildContext context) {
    final theme = ThemeProvider.of(context);
    return theme.coarsePointer(context)
        ? minSize ?? theme.sizes.touchTarget
        : 0;
  }

  @override
  RenderObject createRenderObject(BuildContext context) =>
      _RenderTouchTarget(TouchTargetScope._of(context), _extent(context));

  @override
  void updateRenderObject(BuildContext context, RenderObject renderObject) {
    (renderObject as _RenderTouchTarget)
      ..registry = TouchTargetScope._of(context)
      ..extent = _extent(context);
  }
}

/// The render object of a [TouchTarget]: lays out exactly like its child.
class _RenderTouchTarget extends RenderProxyBox {
  _RenderTouchTarget(this._registry, this.extent);

  /// The smallest hit area (px); 0 reaches nothing.
  double extent;

  _TouchTargets? _registry;
  set registry(_TouchTargets? value) {
    if (value == _registry) return;
    if (attached) {
      _registry?.targets.remove(this);
      value?.targets.add(this);
    }
    _registry = value;
  }

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties
      ..add(DoubleProperty('extent', extent))
      ..add(
        FlagProperty(
          'registered',
          value: _registry != null,
          ifFalse: 'no TouchTargetScope',
        ),
      );
  }

  @override
  void attach(PipelineOwner owner) {
    super.attach(owner);
    _registry?.targets.add(this);
  }

  @override
  void detach() {
    _registry?.targets.remove(this);
    super.detach();
  }
}

class _TouchTargets {
  final targets = <_RenderTouchTarget>{};
}

/// Resolves the reach of the [TouchTarget]s below it (see there). The root [ThemeProvider]
/// installs one; an app whose controls live outside it can add its own.
class TouchTargetScope extends StatefulWidget {
  const TouchTargetScope({super.key, required this.child});
  final Widget child;

  /// True when a scope encloses [context].
  static bool exists(BuildContext context) =>
      context.getInheritedWidgetOfExactType<_TouchTargetsScope>() != null;

  static _TouchTargets? _of(BuildContext context) =>
      context.getInheritedWidgetOfExactType<_TouchTargetsScope>()?.registry;

  @override
  State<TouchTargetScope> createState() => _TouchTargetScopeState();
}

class _TouchTargetScopeState extends State<TouchTargetScope> {
  final _registry = _TouchTargets();

  @override
  Widget build(BuildContext context) => _TouchTargetsScope(
    registry: _registry,
    child: _TouchTargetResolver(registry: _registry, child: widget.child),
  );
}

class _TouchTargetsScope extends InheritedWidget {
  const _TouchTargetsScope({required this.registry, required super.child});
  final _TouchTargets registry;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties.add(IntProperty('targets', registry.targets.length));
  }

  @override
  bool updateShouldNotify(_TouchTargetsScope old) => old.registry != registry;
}

class _TouchTargetResolver extends SingleChildRenderObjectWidget {
  const _TouchTargetResolver({required this.registry, required super.child});
  final _TouchTargets registry;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties.add(IntProperty('targets', registry.targets.length));
  }

  @override
  RenderObject createRenderObject(BuildContext context) =>
      _RenderTouchTargetResolver(registry);

  @override
  void updateRenderObject(
    BuildContext context,
    _RenderTouchTargetResolver renderObject,
  ) {
    renderObject.registry = registry;
  }
}

/// A control within reach of a press: where the press lands on it, and how far away it is.
typedef _Reach = ({
  _RenderTouchTarget target,
  Matrix4 transform,
  Offset clamped,
  double distance,
});

class _RenderTouchTargetResolver extends RenderProxyBox {
  _RenderTouchTargetResolver(this.registry);
  _TouchTargets registry;

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties.add(IntProperty('targets', registry.targets.length));
  }

  @override
  bool hitTest(BoxHitTestResult result, {required Offset position}) {
    if (!size.contains(position)) return false;
    final reach = _reach(position);
    if (reach != null) {
      // The control is hit first, as if the press had landed on its nearest edge; the normal
      // path follows, so scroll views and other gestures still compete for the pointer.
      result.addWithPaintTransform(
        transform: reach.transform,
        position: position,
        hitTest: (result, _) =>
            reach.target.hitTest(result, position: reach.clamped),
      );
    }
    return super.hitTest(result, position: position);
  }

  /// The nearest control whose reach (not its own box) holds [position] and that nothing covers,
  /// or null when the press lands on a control or within nobody's reach.
  _Reach? _reach(Offset position) {
    final candidates = <_Reach>[];
    for (final target in registry.targets) {
      if (!target.attached || !target.hasSize) continue;
      final size = target.size;
      // A control folded to nothing (a minimized tab bar's hidden tabs) can't be reached.
      if (size.width < 1 || size.height < 1) continue;
      final dx = touchOutset(size.width, target.extent);
      final dy = touchOutset(size.height, target.extent);
      if (dx == 0 && dy == 0) continue;
      final transform = target.getTransformTo(this);
      final inverse = Matrix4.tryInvert(transform);
      if (inverse == null) continue;
      final local = MatrixUtils.transformPoint(inverse, position);
      final box = Offset.zero & size;
      if (box.contains(local) ||
          !Rect.fromLTRB(
            -dx,
            -dy,
            size.width + dx,
            size.height + dy,
          ).contains(local)) {
        continue;
      }
      final clamped = Offset(
        local.dx.clamp(0.5, size.width - 0.5),
        local.dy.clamp(0.5, size.height - 0.5),
      );
      candidates.add((
        target: target,
        transform: transform,
        clamped: clamped,
        distance: (local - clamped).distance,
      ));
    }
    if (candidates.isEmpty) return null;
    // A press on a control itself is the normal hit test's.
    if (_hits(position).any(registry.targets.contains)) return null;
    candidates.sort((a, b) => a.distance.compareTo(b.distance));
    for (final candidate in candidates) {
      // Only a control that would be hit at its nearest edge: nothing is drawn over it there.
      final at = MatrixUtils.transformPoint(
        candidate.transform,
        candidate.clamped,
      );
      if (_hits(at).contains(candidate.target)) return candidate;
    }
    return null;
  }

  /// The render objects a normal hit test at [position] reaches.
  Iterable<HitTestTarget> _hits(Offset position) {
    final probe = BoxHitTestResult();
    super.hitTest(probe, position: position);
    return probe.path.map((entry) => entry.target);
  }
}
