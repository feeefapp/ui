import 'dart:convert';
import 'dart:io';

import 'package:feeef_ui/primitives/button.dart';
import 'package:feeef_ui/scaffold.dart';
import 'package:feeef_ui/theme.dart';
import 'package:feeef_ui/toolbar.dart';
import 'package:feeef_ui/toolbar_search.dart';
import 'package:feeef_ui/toolbar_search_motion.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

Widget _host(Widget child, {double width = 400, bool reduced = false}) =>
    WidgetsApp(
      color: const Color(0xFF000000),
      builder: (context, _) => MediaQuery(
        data: MediaQuery.of(context).copyWith(disableAnimations: reduced),
        child: Directionality(
          textDirection: TextDirection.ltr,
          child: FocusScope(
            autofocus: true,
            child: ThemeProvider(
              config: ThemeConfig.defaults,
              brightness: Brightness.light,
              child: Align(
                alignment: Alignment.topLeft,
                child: SizedBox(width: width, child: child),
              ),
            ),
          ),
        ),
      ),
    );

/// Pumps fixed frames: the morph is a spring.
Future<void> frames(WidgetTester tester, [int count = 90]) async {
  for (var i = 0; i < count; i++) {
    await tester.pump(const Duration(milliseconds: 16));
  }
}

/// Unmounts and lets the glass springs come to rest.
Future<void> finish(WidgetTester tester) async {
  await tester.pumpWidget(const SizedBox());
  await frames(tester, 60);
}

final macOS = TargetPlatformVariant.only(TargetPlatform.macOS);

/// Width of the capsule (the SizedBox the spring drives).
Finder capsule() => find.ancestor(
  of: find.byType(EditableText),
  matching: find.byType(GlassGroup),
);

double capsuleWidth(WidgetTester tester) => tester.getSize(capsule()).width;

Finder trigger() =>
    find.descendant(of: capsule(), matching: find.byType(IconButton)).first;

class _Harness extends StatefulWidget {
  const _Harness({this.onExpanded, this.defaultExpanded = false});
  final ValueChanged<bool>? onExpanded;
  final bool defaultExpanded;
  @override
  State<_Harness> createState() => _HarnessState();
}

class _HarnessState extends State<_Harness> {
  String value = '';
  int filters = 0;
  @override
  Widget build(BuildContext context) => ToolbarSearch(
    label: 'Search orders',
    value: value,
    defaultExpanded: widget.defaultExpanded,
    onValueChange: (v) => setState(() => value = v),
    onExpandedChange: widget.onExpanded,
    trailing: const SizedBox(width: 50, height: 46),
    children: [
      ToolbarGroup(
        label: 'Filters',
        children: [
          IconButton(
            appearance: ButtonAppearance.toolbar,
            controlSize: ControlSize.compact,
            ariaLabel: 'Filter',
            onClick: () => setState(() => filters++),
            icon: const SizedBox(width: 20, height: 20),
          ),
        ],
      ),
    ],
  );
}

void main() {
  group('motion matches the web kit', () {
    final fixture = jsonDecode(
      File('test/fixtures/search.json').readAsStringSync(),
    ) as Map<String, dynamic>;
    double n(Object? v) => (v as num).toDouble();

    test('spring runs frame by frame', () {
      for (final run in fixture['runs'] as List) {
        StepSpringStateLike state = (
          position: n(run['from']),
          velocity: n(run['velocity']),
        );
        for (final frame in run['frames'] as List) {
          state = stepSearchMorph(state, n(run['to']), n(run['dt']));
          expect(state.position, closeTo(n(frame['position']), 1e-9));
          expect(state.velocity, closeTo(n(frame['velocity']), 1e-9));
          final progress = searchMorphProgress(
            state.position,
            n(run['compact']),
            n(run['wide']),
          );
          expect(progress, closeTo(n(frame['progress']), 1e-9));
          final v = searchMorphVisibility(progress);
          expect(v.editor, closeTo(n(frame['editor']), 1e-9));
          expect(v.controls, closeTo(n(frame['controls']), 1e-9));
          expect(searchMorphSettled(state, n(run['to'])), frame['settled']);
        }
      }
    });

    test('elapsed time is clamped and substepped', () {
      for (final row in fixture['elapsed'] as List) {
        final s = stepSearchMorph(
          (position: 10, velocity: -30),
          250,
          n(row['dt']),
        );
        expect(s.position, closeTo(n(row['state']['position']), 1e-9));
        expect(s.velocity, closeTo(n(row['state']['velocity']), 1e-9));
      }
    });

    test('visibility windows and progress', () {
      for (final row in fixture['visibility'] as List) {
        final v = searchMorphVisibility(n(row['progress']));
        expect(v.editor, closeTo(n(row['editor']), 1e-9));
        expect(v.controls, closeTo(n(row['controls']), 1e-9));
      }
      for (final row in fixture['progress'] as List) {
        expect(
          searchMorphProgress(
            n(row['position']),
            n(row['compact']),
            n(row['wide']),
          ),
          closeTo(n(row['value']), 1e-9),
        );
      }
    });
  });

  testWidgets('opens to the free width, focuses, and collapses with Escape', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    final changes = <bool>[];
    await tester.pumpWidget(_host(_Harness(onExpanded: changes.add)));
    await tester.pump();
    // Collapsed: control size 40 + 6.
    expect(capsuleWidth(tester), 46);
    expect(find.semantics.byLabel('Filter'), findsOne);

    await tester.tap(trigger());
    await frames(tester);
    // 400 - trailing 50 - gap 12.
    expect(capsuleWidth(tester), closeTo(338, 1e-6));
    expect(changes, [true]);
    // The absorbed neighbour leaves the semantics tree while the field is open.
    expect(find.semantics.byLabel('Filter'), findsNothing);
    expect(find.semantics.byLabel('Close search'), findsOne);

    await tester.enterText(find.byType(EditableText), 'abc');
    await tester.pump();
    final state = tester.state<State<_Harness>>(find.byType(_Harness));
    expect((state as _HarnessState).value, 'abc');

    await tester.sendKeyEvent(LogicalKeyboardKey.escape);
    await tester.pump();
    // Collapsing clears the query; the cleared text keeps showing while it closes.
    expect(state.value, '');
    expect(find.text('abc'), findsOneWidget);
    await frames(tester);
    expect(capsuleWidth(tester), 46);
    expect(changes, [true, false]);
    expect(find.semantics.byLabel('Filter'), findsOne);
    semantics.dispose();
    await finish(tester);
  }, variant: macOS);

  testWidgets('clear button empties the query and keeps the field open', (
    tester,
  ) async {
    await tester.pumpWidget(_host(const _Harness(defaultExpanded: true)));
    await frames(tester, 5);
    expect(capsuleWidth(tester), closeTo(338, 1e-6));
    await tester.enterText(find.byType(EditableText), 'xyz');
    await tester.pump();
    await tester.tap(
      find.descendant(of: capsule(), matching: find.byType(IconButton)).last,
    );
    await tester.pump();
    final state =
        tester.state<State<_Harness>>(find.byType(_Harness)) as _HarnessState;
    expect(state.value, '');
    expect(capsuleWidth(tester), closeTo(338, 1e-6));
    await finish(tester);
  }, variant: macOS);

  testWidgets('reduced motion jumps without animating', (tester) async {
    await tester.pumpWidget(_host(const _Harness(), reduced: true));
    await tester.pump();
    await tester.tap(trigger());
    await tester.pump();
    expect(capsuleWidth(tester), closeTo(338, 1e-6));
    await finish(tester);
  }, variant: macOS);

  testWidgets('follows a width change with the spring', (tester) async {
    Widget at(double width) =>
        _host(const _Harness(defaultExpanded: true), width: width);
    await tester.pumpWidget(at(400));
    await frames(tester, 3);
    await tester.pumpWidget(at(300));
    await frames(tester);
    expect(capsuleWidth(tester), closeTo(238, 1e-6));
    await finish(tester);
  }, variant: macOS);
}

typedef StepSpringStateLike = ({double position, double velocity});
