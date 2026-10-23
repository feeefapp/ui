// Frame-timing bench for the Flutter kit. Run through bench/flutter.sh (`flutter run --profile`).
//
// The app drives itself: for each page (all docs examples of one docs page, stacked) and each
// repetition it runs the same scenarios as bench/web.mjs, feeding synthetic pointer events into
// GestureBinding, and collects engine FrameTimings (build = UI thread, raster = raster thread).
// Each window ends with a 400 ms tail so the engine's batched timing reports arrive; tail frames
// count with the scenario. Medians over repetitions are written to $BENCH_OUT as JSON.
//
// Not an integration test on purpose: the flutter_test live binding renders frames forever while
// any scroll view is on screen (≈48 fps on a plain SingleChildScrollView of Text), which hides the
// steady-state numbers this bench exists for. A plain app produces zero idle frames there.
import 'dart:convert';
import 'dart:io';
import 'dart:ui' show FrameTiming, PointerDeviceKind;

import 'package:feeef_ui/feeef_ui.dart' as kit;
import 'package:flutter/foundation.dart' show kProfileMode, kReleaseMode;
import 'package:flutter/gestures.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/widgets.dart';

import 'examples/registry.dart';
import 'main.dart';

const reps = int.fromEnvironment('BENCH_REPS', defaultValue: 3);
const scenarioList = String.fromEnvironment('BENCH_SCENARIOS', defaultValue: 'idle,scroll,pointer,menu,drag,split');
const outPath = String.fromEnvironment('BENCH_OUT', defaultValue: '');
const budgetUs = 16667;

Future<void> wait(int ms) => Future<void>.delayed(Duration(milliseconds: ms));
void log(String m) => stdout.writeln('[flutter bench] $m');

// ---- frame timings -----------------------------------------------------------------------------
class Collector {
  final List<FrameTiming> _timings = [];
  void _on(List<FrameTiming> t) => _timings.addAll(t);
  void start() {
    _timings.clear();
    SchedulerBinding.instance.addTimingsCallback(_on);
  }

  Future<List<FrameTiming>> stop() async {
    await wait(400);
    SchedulerBinding.instance.removeTimingsCallback(_on);
    return List.of(_timings);
  }
}

double _ms(Duration d) => d.inMicroseconds / 1000;
Map<String, double?> _pcts(List<double> v) {
  if (v.isEmpty) return {'p50': null, 'p95': null, 'max': null};
  final s = [...v]..sort();
  double at(double p) => s[((p / 100) * s.length).floor().clamp(0, s.length - 1)];
  return {'p50': at(50), 'p95': at(95), 'max': s.last};
}

Map<String, Object?> stats(List<FrameTiming> t) {
  final build = t.map((f) => _ms(f.buildDuration)).toList();
  final raster = t.map((f) => _ms(f.rasterDuration)).toList();
  bool over(FrameTiming f, int us) => f.buildDuration.inMicroseconds > us || f.rasterDuration.inMicroseconds > us;
  return {
    'frames': t.length,
    'build': _pcts(build),
    'raster': _pcts(raster),
    'missed': t.where((f) => over(f, budgetUs)).length,
    'missed33': t.where((f) => over(f, 2 * budgetUs)).length,
    'buildTotalMs': build.fold<double>(0, (a, b) => a + b),
    'rasterTotalMs': raster.fold<double>(0, (a, b) => a + b),
  };
}

/// Median of every numeric leaf across repetitions.
Object? mergeReps(List<Object?> values) {
  final present = values.where((v) => v != null).toList();
  if (present.isEmpty) return null;
  final first = present.first;
  if (first is num) {
    final s = present.cast<num>().map((n) => n.toDouble()).toList()..sort();
    final m = s.length ~/ 2;
    final med = s.length.isOdd ? s[m] : (s[m - 1] + s[m]) / 2;
    return (med * 100).round() / 100;
  }
  if (first is Map) {
    final keys = {for (final v in present) ...(v as Map).keys};
    return {for (final k in keys) k as String: mergeReps(present.map((v) => (v as Map)[k]).toList())};
  }
  return first;
}

// ---- element lookup ----------------------------------------------------------------------------
List<Element> findAll(bool Function(Widget w) test, {Element? within}) {
  final out = <Element>[];
  void visit(Element e) {
    if (test(e.widget)) out.add(e);
    e.visitChildElements(visit);
  }

  final root = within ?? WidgetsBinding.instance.rootElement;
  if (root != null) visit(root);
  return out;
}

Element? stage(String id) => findAll((w) => w.key == ValueKey('stage:$id')).firstOrNull;

Element? textIn(Element? scope, String label) => scope == null
    ? null
    : findAll((w) => (w is Text && w.data == label) || (w is RichText && w.text.toPlainText() == label), within: scope).firstOrNull;

Rect rectOf(Element e) {
  final box = e.findRenderObject()! as RenderBox;
  return box.localToGlobal(Offset.zero) & box.size;
}

Future<Rect> show(Element e) async {
  await Scrollable.ensureVisible(e, alignment: 0.5);
  await wait(400);
  return rectOf(e);
}

void toTop() {
  final scroll = findAll((w) => w.key == const ValueKey('bench-scroll')).firstOrNull;
  if (scroll == null) return;
  final s = findAll((w) => w is Scrollable, within: scroll).firstOrNull;
  ((s as StatefulElement?)?.state as ScrollableState?)?.position.jumpTo(0);
}

// ---- synthetic pointer -------------------------------------------------------------------------
final _clock = Stopwatch()..start();
var _pointer = 100;
const _device = 7;
var _added = false;
var _at = Offset.zero;
void _send(PointerEvent e) => GestureBinding.instance.handlePointerEvent(e);
Duration get _now => _clock.elapsed;

void hover(Offset p) {
  if (!_added) {
    _send(PointerAddedEvent(timeStamp: _now, kind: PointerDeviceKind.mouse, device: _device, position: p));
    _added = true;
  }
  _send(PointerHoverEvent(timeStamp: _now, kind: PointerDeviceKind.mouse, device: _device, position: p, delta: p - _at));
  _at = p;
}

void wheel(Offset p, double dy) {
  hover(p);
  _send(PointerScrollEvent(timeStamp: _now, kind: PointerDeviceKind.mouse, device: _device, position: p, scrollDelta: Offset(0, dy)));
}

void down(Offset p) {
  hover(p);
  _pointer++;
  _send(PointerDownEvent(timeStamp: _now, pointer: _pointer, kind: PointerDeviceKind.mouse, device: _device, position: p, buttons: kPrimaryMouseButton));
}

void move(Offset p) {
  _send(PointerMoveEvent(timeStamp: _now, pointer: _pointer, kind: PointerDeviceKind.mouse, device: _device, position: p, delta: p - _at, buttons: kPrimaryMouseButton));
  _at = p;
}

void up() => _send(PointerUpEvent(timeStamp: _now, pointer: _pointer, kind: PointerDeviceKind.mouse, device: _device, position: _at));

Future<void> click(Offset p) async {
  down(p);
  await wait(60);
  up();
}

Future<void> dragAcross(Offset from, Offset to) async {
  down(from);
  for (final (a, b) in [(from, to), (to, from)]) {
    for (var i = 1; i <= 24; i++) {
      move(Offset.lerp(a, b, i / 24)!);
      await wait(16);
    }
  }
  up();
  await wait(400);
}

// ---- scenarios ---------------------------------------------------------------------------------
typedef Run = Future<void> Function();
final drivers = <String, Future<Run?> Function()>{
  'scroll': () async {
    final view = WidgetsBinding.instance.platformDispatcher.views.first;
    final size = view.physicalSize / view.devicePixelRatio;
    final center = Offset(size.width / 2, size.height / 2);
    return () async {
      for (final dy in [120.0, -120.0]) {
        for (var i = 0; i < 30; i++) {
          wheel(center, dy);
          await wait(16);
        }
        await wait(300);
      }
    };
  },
  'pointer': () async {
    Element? target;
    for (final type in [kit.GlassContainer, kit.ToolbarGroup, kit.GlassGroup]) {
      target = findAll((w) => w.runtimeType == type).firstOrNull;
      if (target != null) break;
    }
    if (target == null) return null;
    final r = await show(target);
    return () async {
      final end = DateTime.now().add(const Duration(seconds: 2));
      var i = 0;
      while (DateTime.now().isBefore(end)) {
        final t = (i % 60) / 60;
        final u = t < 0.5 ? t * 2 : 2 - t * 2;
        hover(Offset(r.left - 20 + (r.width + 40) * u, r.top + r.height * (0.25 + 0.5 * (i / 7).remainder(1))));
        i++;
        await wait(16);
      }
      hover(const Offset(2, 2));
    };
  },
  'menu': () async {
    const id = 'components/actions-bar/06-menus-at-both-ends';
    final scope = stage(id);
    final button = scope == null ? null : findAll((w) => w is kit.IconButton && w.ariaLabel == 'More actions', within: scope).firstOrNull;
    if (button == null) return null;
    final at = (await show(button)).center;
    final outside = rectOf(scope!).topLeft + const Offset(8, 8);
    return () async {
      for (var i = 0; i < 2; i++) {
        await click(at);
        await wait(700);
        await click(outside);
        await wait(700);
      }
    };
  },
  'drag': () async {
    final seg = findAll((w) => w is kit.SegmentedControl).firstOrNull;
    final sw = findAll((w) => w is kit.SlideSwitch).firstOrNull;
    if (seg == null && sw == null) return null;
    return () async {
      if (seg != null) {
        final r = await show(seg);
        // The first option is selected in most examples: press it and carry the pill across.
        await dragAcross(Offset(r.left + r.height / 2 + 8, r.center.dy), Offset(r.right - r.height / 2 - 8, r.center.dy));
      }
      if (sw != null) {
        final r = await show(sw);
        await dragAcross(Offset(r.left + r.height / 2, r.center.dy), Offset(r.right - r.height / 2, r.center.dy));
      }
    };
  },
  'split': () async {
    const id = 'components/glass-container/01-split-merge';
    final apart = textIn(stage(id), 'Delete on its own');
    if (apart == null) return null;
    await show(apart);
    return () async {
      for (final label in ['Delete on its own', 'One bubble']) {
        await click(rectOf(textIn(stage(id), label)!).center);
        await wait(1200);
      }
    };
  },
};

Future<void> main() async {
  runApp(const BenchApp());
  final pages = [...benchPages.keys, baselinePage];
  final scenarios = scenarioList.split(',');
  final collector = Collector();
  final perPage = <String, List<Map<String, Object?>>>{};

  Future<Map<String, Object?>> idle() async {
    collector.start();
    await wait(3000);
    return stats(await collector.stop());
  }

  // Harness floor: the kit providers with an empty page. Anything here is not a page's doing.
  await wait(2000);
  (perPage['harness/providers'] ??= []).add({'idle': await idle()});

  for (var rep = 0; rep < reps; rep++) {
    for (final page in pages) {
      log('$page rep ${rep + 1}/$reps');
      benchPage.value = null;
      await wait(300);
      benchPage.value = page;
      await wait(2000); // first build, shader warm-up, entry animations
      final result = <String, Object?>{};
      for (final scenario in scenarios) {
        hover(const Offset(2, 2)); // park the pointer in a corner
        await wait(800);
        if (scenario == 'idle') {
          result['idle'] = await idle();
          continue;
        }
        toTop(); // every scenario starts from the top of the page
        await wait(300);
        final run = await drivers[scenario]?.call();
        if (run == null) continue;
        await wait(300);
        collector.start();
        await run();
        result[scenario] = stats(await collector.stop());
      }
      // A page that renders while idle: find which examples do, one at a time.
      final idleFrames = (result['idle'] as Map?)?['frames'] as int? ?? 0;
      if (idleFrames > 0 && benchPages.containsKey(page)) {
        final byExample = <String, Object?>{};
        for (final (id, _) in benchPages[page]!) {
          benchPage.value = 'example:$id';
          await wait(1500);
          final s = await idle();
          byExample[id] = {'frames': s['frames'], 'buildTotalMs': s['buildTotalMs'], 'rasterTotalMs': s['rasterTotalMs']};
        }
        result['idleByExample'] = byExample;
      }
      (perPage[page] ??= []).add(result);
    }
  }

  final view = WidgetsBinding.instance.platformDispatcher.views.first;
  final report = {
    'label': const String.fromEnvironment('BENCH_LABEL', defaultValue: 'run'),
    'theme': benchTheme.isEmpty ? 'default' : benchTheme,
    'date': DateTime.now().toUtc().toIso8601String(),
    'device': '${Platform.operatingSystem} ${Platform.operatingSystemVersion}',
    'window': '${(view.physicalSize / view.devicePixelRatio).width.round()}×${(view.physicalSize / view.devicePixelRatio).height.round()} @${view.devicePixelRatio}x',
    'mode': kProfileMode ? 'profile' : (kReleaseMode ? 'release' : 'debug'),
    'reps': reps,
    'note': 'Build = UI thread, raster = raster thread, per frame (ms). missed = build or raster > 16.7 ms. '
        'Each window includes a 400 ms tail. Idle = 3 s with nothing moving: ideally 0 frames.',
    'pages': {for (final e in perPage.entries) e.key: mergeReps(e.value)},
  };
  final json = const JsonEncoder.withIndent('  ').convert(report);
  if (outPath.isNotEmpty) {
    File(outPath).writeAsStringSync(json);
    log('wrote $outPath');
  } else {
    stdout.writeln(json);
  }
  exit(0);
}
