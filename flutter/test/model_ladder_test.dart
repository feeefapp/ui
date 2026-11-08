import 'dart:convert';
import 'dart:io';

import 'package:feeef_ui/i18n/i18n.dart';
import 'package:feeef_ui/model_ladder.dart';
import 'package:feeef_ui/toolbar_search.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

import 'widgets_test.dart' show host;

/// Popover grain and the top-rung fire animate forever, like the web kit's, so pump fixed steps.
Future<void> settle(WidgetTester tester, [int steps = 12]) async {
  for (var i = 0; i < steps; i++) {
    await tester.pump(const Duration(milliseconds: 50));
  }
}

Widget overlay(Widget child) => host(
  Overlay(
    initialEntries: [
      OverlayEntry(
        builder: (context) => Center(child: SizedBox(width: 360, child: child)),
      ),
    ],
  ),
);

const rungs = [
  LadderStop(modelId: 'flash', label: 'flash', modelName: 'flash'),
  LadderStop(
    modelId: 'gpt',
    label: 'Balanced',
    modelName: 'GPT Image',
    access: LadderAccess.free,
  ),
  LadderStop(
    modelId: 'pro',
    label: 'pro',
    modelName: 'Imagen Pro',
    access: LadderAccess.pro,
    priceUsd: 0.04,
  ),
];

void main() {
  final fixture = jsonDecode(
    File('test/fixtures/misc.json').readAsStringSync(),
  ) as Map<String, dynamic>;
  double n(Object? v) => (v as num).toDouble();

  group('core matches the web kit', () {
    test('visibleLabel and displayName', () {
      for (final row in fixture['ladder'] as List) {
        final s = row['stop'] as Map<String, dynamic>;
        final stop = LadderStop(
          modelId: s['modelId'] as String,
          label: s['label'] as String,
          modelName: s['modelName'] as String,
        );
        final index = row['index'] as int, count = row['count'] as int;
        expect(visibleLabel(stop, index, count), row['visible'], reason: '$s');
        expect(displayName(stop, index, count), row['display'], reason: '$s');
      }
    });

    test('middleIndex, heatAt and formatUsd', () {
      for (final row in fixture['middle'] as List) {
        expect(middleIndex(row[0] as int), row[1]);
      }
      for (final row in fixture['heat'] as List) {
        expect(heatAt(n(row[0]), row[1] as int), closeTo(n(row[2]), 1e-9));
      }
      for (final row in fixture['usd'] as List) {
        expect(formatUsd(n(row[0])), row[1], reason: '${row[0]}');
      }
    });

    test('fire noise and cells', () {
      for (final row in fixture['noise'] as List) {
        expect(
          fireNoise(row[0] as int, row[1] as int, row[2] as int),
          closeTo(n(row[3]), 1e-9),
        );
      }
      for (final row in fixture['fire'] as List) {
        expect(
          fireCell(row[0] as int, row[1] as int, row[2] as int, row[3] as int),
          row[4],
          reason: '$row',
        );
      }
    });

    test('Ladder.fromJson reads the Lab API shape', () {
      final ladder = Ladder.fromJson({
        'id': 'image',
        'name': 'Image',
        'source': 'cloud',
        'defaultIndex': 1,
        'stops': [
          {
            'modelId': 'a',
            'label': 'Fast',
            'modelName': 'A',
            'description': null,
            'access': 'free',
          },
        ],
      });
      expect(ladder.source, LadderSource.cloud);
      expect(ladder.stops.single.access, LadderAccess.free);
      expect(ladder.defaultIndex, 1);
    });
  });

  group('ModelLadderCard', () {
    testWidgets('shows the tier, the name, the price and resets to default', (
      tester,
    ) async {
      var index = 2;
      await tester.pumpWidget(
        overlay(
          StatefulBuilder(
            builder: (context, setState) => ModelLadderCard(
              stops: rungs,
              index: index,
              defaultIndex: 1,
              onChange: (i) => setState(() => index = i),
            ),
          ),
        ),
      );
      await settle(tester, 4);
      // "pro" copies the id, so the top rung reads "Best".
      expect(find.text('Best'), findsOneWidget);
      expect(find.text('Imagen Pro'), findsOneWidget);
      expect(find.text('Usually about \$0.040'), findsOneWidget);
      expect(find.text('Pro'), findsOneWidget);
      await tester.tap(find.bySemanticsLabel('Reset to default'));
      await settle(tester, 4);
      expect(index, 1);
      expect(find.text('Balanced'), findsOneWidget);
      expect(find.text('Free'), findsOneWidget);
      // At the default the reset button is disabled.
      await tester.tap(find.bySemanticsLabel('Reset to default'));
      expect(index, 1);
    });

    testWidgets(
      'the title opens the model list; picking a rung moves the ladder',
      (tester) async {
        var index = 0;
        String? picked;
        await tester.pumpWidget(
          overlay(
            StatefulBuilder(
              builder: (context, setState) => ModelLadderCard(
                stops: rungs,
                index: index,
                catalog: [
                  ...rungs,
                  const LadderStop(
                    modelId: 'other',
                    label: '',
                    modelName: 'Other model',
                    description: 'Outside the ladder',
                  ),
                ],
                onChange: (i) => setState(() => index = i),
                onPickModel: (id) => picked = id,
              ),
            ),
          ),
        );
        await settle(tester, 4);
        await tester.tap(find.text('Fast'));
        await settle(tester, 4);
        expect(find.text('Choose a model'), findsOneWidget);
        expect(find.text('Outside the ladder'), findsOneWidget);
        await tester.tap(find.text('GPT Image'));
        await settle(tester, 4);
        expect(index, 1);
        expect(find.text('Choose a model'), findsNothing);
        await tester.tap(find.text('Balanced'));
        await settle(tester, 4);
        await tester.tap(find.text('Other model'));
        await settle(tester, 4);
        expect(picked, 'other');
      },
    );

    testWidgets('Escape in the list goes back to the ladder', (tester) async {
      await tester.pumpWidget(
        overlay(ModelLadderCard(stops: rungs, index: 0, onChange: (_) {})),
      );
      await settle(tester, 4);
      await tester.tap(find.text('Fast'));
      await settle(tester, 4);
      expect(find.text('Choose a model'), findsOneWidget);
      await tester.sendKeyEvent(LogicalKeyboardKey.escape);
      await settle(tester, 4);
      expect(find.text('Choose a model'), findsNothing);
    }, variant: TargetPlatformVariant.only(TargetPlatform.macOS));

    testWidgets('long lists get a search that filters by name and id', (
      tester,
    ) async {
      final many = [
        for (var i = 0; i < 8; i++)
          LadderStop(modelId: 'm$i', label: 'T$i', modelName: 'Model $i'),
      ];
      await tester.pumpWidget(
        overlay(ModelLadderCard(stops: many, index: 0, onChange: (_) {})),
      );
      await settle(tester, 4);
      await tester.tap(find.text('T0'));
      await settle(tester, 4);
      // The kit's ToolbarSearch, open from the start with the keyboard in it.
      expect(find.byType(ToolbarSearch), findsOneWidget);
      expect(find.byType(EditableText), findsOneWidget);
      final field = tester.widget<EditableText>(find.byType(EditableText));
      expect(field.focusNode.hasFocus, isTrue);
      await tester.enterText(find.byType(EditableText), 'model 3');
      await settle(tester, 4);
      expect(find.text('Model 3'), findsOneWidget);
      expect(find.text('Model 4'), findsNothing);
      await tester.enterText(find.byType(EditableText), 'zzz');
      await settle(tester, 4);
      expect(find.text('No models match.'), findsOneWidget);
      // Arrow down from the field moves into the options.
      await tester.enterText(find.byType(EditableText), 'model');
      await settle(tester, 4);
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowDown);
      await settle(tester, 2);
      expect(field.focusNode.hasFocus, isFalse);
    });

    testWidgets(
      'Arabic catalog rows retain distinct model ids and support search',
      (tester) async {
        final many = [
          for (var i = 0; i < 8; i++)
            LadderStop(
              modelId: 'provider/model-$i',
              label: '',
              modelName: 'provider/model-$i',
            ),
        ];
        await tester.pumpWidget(
          overlay(
            I18nProvider(
              locale: 'ar',
              child: ModelLadderCard(stops: many, index: 1, onChange: (_) {}),
            ),
          ),
        );
        await settle(tester, 4);
        expect(find.text('provider/model-1'), findsOneWidget);
        await tester.tap(find.text('provider/model-1'));
        await settle(tester, 4);
        expect(find.text('provider/model-1'), findsOneWidget);
        expect(find.text('provider/model-2'), findsOneWidget);
        final nameContext = tester.element(find.text('provider/model-1'));
        expect(Directionality.of(nameContext), TextDirection.rtl);
        await tester.enterText(find.byType(EditableText), 'model-6');
        await settle(tester, 4);
        expect(find.text('provider/model-6'), findsOneWidget);
        expect(find.text('provider/model-1'), findsNothing);
        expect(tester.takeException(), isNull);
      },
    );

    testWidgets('a canvas readout shows the size, aspect and a fitted box', (
      tester,
    ) async {
      await tester.pumpWidget(
        overlay(
          ModelLadderCard(
            stops: rungs,
            index: 0,
            onChange: (_) {},
            canvas: const AspectReadout(
              size: '1024 × 1536',
              aspect: '2:3',
              widthOverHeight: 2 / 3,
            ),
          ),
        ),
      );
      await settle(tester, 4);
      expect(find.text('1024 × 1536'), findsOneWidget);
      expect(find.text('2:3'), findsOneWidget);
      expect(tester.getSize(find.byType(AspectBox)), const Size(20, 20));
    });
  });

  testWidgets('ModelLadder opens its card in a popover and closes on Escape', (
    tester,
  ) async {
    bool? open;
    await tester.pumpWidget(
      overlay(
        ModelLadder(
          stops: rungs,
          index: 1,
          onChange: (_) {},
          onOpenChange: (value) => open = value,
        ),
      ),
    );
    expect(find.text('Balanced'), findsOneWidget);
    expect(find.text('GPT Image'), findsOneWidget);
    expect(find.byType(ModelLadderCard), findsNothing);
    await tester.tap(find.text('Balanced'));
    await settle(tester);
    expect(open, true);
    expect(find.byType(ModelLadderCard), findsOneWidget);
    await tester.sendKeyEvent(LogicalKeyboardKey.escape);
    await settle(tester);
    expect(open, false);
    expect(find.byType(ModelLadderCard), findsNothing);
  }, variant: TargetPlatformVariant.only(TargetPlatform.macOS));

  testWidgets('a disabled ModelLadder never opens; no stops renders nothing', (
    tester,
  ) async {
    await tester.pumpWidget(
      overlay(
        ModelLadder(stops: rungs, index: 0, enabled: false, onChange: (_) {}),
      ),
    );
    await tester.tap(find.text('Fast').first);
    await settle(tester, 4);
    expect(find.byType(ModelLadderCard), findsNothing);
    // The overlay keeps its first entry, so check the empty ladder on its own.
    await tester.pumpWidget(
      host(ModelLadder(stops: const [], index: 0, onChange: (_) {})),
    );
    expect(find.byType(Text), findsNothing);
  });

  testWidgets('Arabic, right to left: localized copy and a mirrored layout', (
    tester,
  ) async {
    await tester.pumpWidget(
      host(
        I18nProvider(
          locale: 'ar',
          child: SizedBox(
            width: 360,
            child: ModelLadderCard(stops: rungs, index: 1, onChange: (_) {}),
          ),
        ),
        direction: TextDirection.rtl,
      ),
    );
    await settle(tester, 4);
    expect(find.text('مجاني'), findsOneWidget);
    expect(find.bySemanticsLabel('إعادة تعيين إلى الافتراضي'), findsOneWidget);
    final reset = tester.getCenter(
      find.bySemanticsLabel('إعادة تعيين إلى الافتراضي'),
    );
    final title = tester.getCenter(find.text('Balanced'));
    expect(reset.dx, lessThan(title.dx));
  });
}
