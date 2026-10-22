import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart' hide Action, RadioGroup;
import 'package:flutter_test/flutter_test.dart';

import 'widgets_test.dart' show host;

/// The host width, changeable after the first pump (an Overlay keeps its first entries).
final width = ValueNotifier<double>(600);

Widget bar(List<Action> actions) => host(
  Overlay(
    initialEntries: [
      OverlayEntry(
        builder: (context) => Center(
          child: ValueListenableBuilder<double>(
            valueListenable: width,
            builder: (context, w, _) => SizedBox(
              width: w,
              child: ActionsBar(label: 'Order actions', actions: actions),
            ),
          ),
        ),
      ),
    ],
  ),
);

Future<void> settle(WidgetTester tester) async {
  for (var i = 0; i < 12; i++) {
    await tester.pump(const Duration(milliseconds: 50));
  }
}

void main() {
  final fixture = jsonDecode(
    File('test/fixtures/actions.json').readAsStringSync(),
  ) as Map<String, dynamic>;

  test('fitting and the visible-set diff match the web kit', () {
    for (final l in fixture['layouts'] as List) {
      final widths = [for (final w in l['widths']) (w as num).toDouble()];
      final priorities = [
        for (final p in l['priorities']) (p as num).toDouble(),
      ];
      final ids = [for (var i = 0; i < widths.length; i++) i];
      final layout = computeActionsLayout<int>(
        actions: ids,
        maxWidth: (l['maxWidth'] as num).toDouble(),
        measure: (i) => widths[i],
        priority: (i) => priorities[i],
      );
      expect([for (final i in layout.visible) 'a$i'], l['visible']);
      expect([for (final i in layout.overflow) 'a$i'], l['overflow']);
      expect(layout.requiredWidth, (l['requiredWidth'] as num).toDouble());
    }
    final d = diffVisibleActions(['a', 'b', 'c'], ['a', 'c', 'd']);
    expect(d.entering, fixture['diff']['entering']);
    expect(d.leaving, fixture['diff']['leaving']);
    expect(d.staying, fixture['diff']['staying']);
  });

  testWidgets('what does not fit moves into More, which runs it', (
    tester,
  ) async {
    var archived = 0;
    final actions = <Action>[
      CommandAction(id: 'print', label: 'Print', onAction: () {}),
      CommandAction(id: 'ship', label: 'Ship', priority: 2, onAction: () {}),
      CommandAction(
        id: 'archive',
        label: 'Archive',
        priority: -1,
        onAction: () => archived++,
      ),
    ];
    width.value = 600;
    await tester.pumpWidget(bar(actions));
    await settle(tester);
    expect(find.bySemanticsLabel('More actions'), findsNothing);
    width.value = 150;
    await settle(tester);
    // Ship (highest priority) stays; Archive (lowest) spills first.
    expect(find.text('Ship').hitTestable(), findsOneWidget);
    await tester.tap(find.byType(IconButton).hitTestable().last);
    await settle(tester);
    await tester.tap(find.text('Archive').hitTestable());
    await settle(tester);
    expect(archived, 1);
  }, variant: TargetPlatformVariant.only(TargetPlatform.macOS));

  testWidgets('a pending command shows a loader; a failure is reported', (
    tester,
  ) async {
    final done = Completer<void>();
    Object? reported;
    await tester.pumpWidget(
      host(
        SizedBox(
          width: 600,
          child: ActionsBar(
            label: 'Order actions',
            onActionError: (error, _) => reported = error,
            actions: [
              CommandAction(
                id: 'save',
                label: 'Save',
                onAction: () => done.future,
              ),
              CommandAction(
                id: 'fail',
                label: 'Sync',
                onAction: () async => throw StateError('offline'),
              ),
            ],
          ),
        ),
      ),
    );
    await settle(tester);
    await tester.tap(find.text('Save').hitTestable());
    await tester.pump();
    // While it runs, a second press is ignored (the button is loading).
    await tester.tap(find.text('Save').hitTestable(), warnIfMissed: false);
    done.complete();
    await settle(tester);
    await tester.tap(find.text('Sync').hitTestable());
    await settle(tester);
    expect(reported, isA<StateError>());
    expect(find.text('Sync could not complete. Try again.'), findsOneWidget);
  }, variant: TargetPlatformVariant.only(TargetPlatform.macOS));
}
