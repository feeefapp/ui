import 'dart:convert';
import 'dart:io';

import 'package:feeef_ui/glass/geometry.dart';
import 'package:feeef_ui/glass/press.dart';
import 'package:feeef_ui/glass/transitions.dart';
import 'package:feeef_ui/physics/motion_value.dart';
import 'package:feeef_ui/physics/spring.dart';
import 'package:feeef_ui/physics/velocity.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  velocityTests();
  final fixture = jsonDecode(
    File('test/fixtures/motion.json').readAsStringSync(),
  ) as Map<String, dynamic>;
  double n(Object? v) => (v as num).toDouble();
  const named = {
    'smooth': Springs.smooth,
    'snappy': Springs.snappy,
    'bouncy': Springs.bouncy,
    'release': Springs.release,
    'interactive': Springs.interactive,
  };

  test('springs solve exactly like the web kit', () {
    for (final entry in fixture['springs'] as List) {
      final spring = named[entry['name']]!;
      final c = springCoefficients(spring);
      expect(c.stiffness, closeTo(n(entry['coefficients']['stiffness']), 1e-9));
      expect(c.damping, closeTo(n(entry['coefficients']['damping']), 1e-9));
      final at = solveSpring(spring, 0, 100, 40);
      for (final s in entry['samples'] as List) {
        final state = at(n(s[0]));
        expect(state.position, closeTo(n(s[1]), 1e-9));
        expect(state.velocity, closeTo(n(s[2]), 1e-9));
      }
    }
    final over = solveSpring(const Spring(duration: 0.5, bounce: -0.4), 10, -5);
    for (final s in fixture['overdamped'] as List) {
      expect(over(n(s[0])).position, closeTo(n(s[1]), 1e-9));
      expect(over(n(s[0])).velocity, closeTo(n(s[2]), 1e-9));
    }
  });

  test('rubber band, stretch and pressed shape match', () {
    for (final r in fixture['rubberBand'] as List) {
      expect(rubberBand(n(r[0]), n(r[1])), closeTo(n(r[2]), 1e-12));
    }
    for (final r in fixture['stretch'] as List) {
      final s = glassStretch(n(r[0]), n(r[1]));
      expect(s.x, closeTo(n(r[2]['x']), 1e-12));
      expect(s.y, closeTo(n(r[2]['y']), 1e-12));
    }
    final p = pressedShape(
      const GlassShape(x: 10, y: 10, width: 100, height: 40, radius: 20),
      1.06,
      6,
      -3,
    );
    final e = fixture['pressed'];
    expect(p.x, closeTo(n(e['x']), 1e-9));
    expect(p.y, closeTo(n(e['y']), 1e-9));
    expect(p.width, closeTo(n(e['width']), 1e-9));
    expect(p.height, closeTo(n(e['height']), 1e-9));
    expect(p.radius, closeTo(n(e['radius']), 1e-9));
  });

  test(
    'a split grows its children out of the parent; far bubbles materialize',
    () {
      const r = Rect.fromLTWH;
      final plan = planGlassTransition(
        {'pair': r(0, 0, 120, 44), 'far': r(400, 0, 44, 44)},
        {
          'left': r(0, 0, 56, 44),
          'right': r(64, 0, 56, 44),
          'new': r(250, 0, 44, 44),
        },
        12,
      );
      final expected = fixture['plan'];
      expect(plan.births.length, (expected['births'] as List).length);
      for (var i = 0; i < plan.births.length; i++) {
        final b = expected['births'][i];
        expect(plan.births[i].id, b['id']);
        expect(plan.births[i] is GlassGrow ? 'grow' : 'materialize', b['kind']);
      }
      for (var i = 0; i < plan.deaths.length; i++) {
        final d = expected['deaths'][i];
        expect(plan.deaths[i].id, d['id']);
        final death = plan.deaths[i];
        expect(death is GlassAbsorb ? 'absorb' : 'dematerialize', d['kind']);
        if (death is GlassAbsorb) expect(death.target, d['target']);
      }
    },
  );

  testWidgets('a motion value springs to its target and reports arrival', (
    tester,
  ) async {
    await tester.pumpWidget(const SizedBox());
    final value = MotionValue(0, 0.01);
    bool? arrived;
    value.animateTo(100, spring: Springs.snappy).then((a) => arrived = a);
    for (var i = 0; i < 90; i++) {
      await tester.pump(const Duration(milliseconds: 16));
    }
    expect(value.get(), 100);
    expect(arrived, isTrue);
    value.animateTo(0).then((a) => arrived = a);
    await tester.pump(const Duration(milliseconds: 16));
    await tester.pump(const Duration(milliseconds: 16));
    value.set(50);
    await tester.pump();
    expect(arrived, isFalse);
    expect(value.get(), 50);
  });
}

void velocityTests() {
  test('velocity tracking matches the web kit', () {
    final cases = jsonDecode(
      File('test/fixtures/velocity.json').readAsStringSync(),
    ) as List;
    for (final c in cases) {
      final t = VelocityTracker();
      for (final s in c['samples'] as List) {
        t.add((s[1] as num).toDouble(), (s[0] as num).toDouble());
      }
      expect(
        t.velocity((c['now'] as num).toDouble()),
        closeTo((c['velocity'] as num).toDouble(), 1e-9),
      );
      expect(t.velocity(), closeTo((c['loose'] as num).toDouble(), 1e-9));
    }
  });
}
