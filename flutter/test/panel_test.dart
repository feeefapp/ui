import 'dart:async';

import 'package:feeef_ui/containers/panel.dart';
import 'package:feeef_ui/containers/sheet.dart';
import 'package:feeef_ui/theme.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

import 'widgets_test.dart' show host;

void main() {
  test(
    'layout uses local width and fits the newest columns without overflow',
    () {
      const sizing = PanelSizing(minWidth: 280, preferredWidth: 340);
      final wide = panelLayout(
        width: 1200,
        rootMinWidth: 320,
        panels: const [sizing, sizing],
        gap: 8,
      );
      expect(wide.compact, isFalse);
      expect(wide.visibleFrom, 0);
      expect(wide.widths.length, 3);
      expect(wide.widths.reduce((a, b) => a + b) + 32, closeTo(1200, 0.01));
      final compact = panelLayout(
        width: 600,
        rootMinWidth: 320,
        panels: const [sizing],
        gap: 8,
      );
      expect(compact.compact, isTrue);
      final deep = panelLayout(
        width: 1000,
        rootMinWidth: 320,
        panels: List.filled(20, sizing),
        gap: 8,
      );
      expect(deep.visibleFrom, 18);
      expect(deep.widths.length, 3);
    },
  );

  test('stack removes descendants and rejects duplicate or unknown IDs', () {
    const stack = ['a', 'b', 'c'];
    expect(panelClose(stack, 'b', (id) => id), ['a']);
    expect(panelClose(stack, 'unknown', (id) => id), stack);
    expect(panelPush(stack, 'd', (id) => id, after: 'a'), ['a', 'd']);
    expect(panelPush(stack, 'd', (id) => id), ['d']);
    expect(() => panelPush(stack, 'a', (id) => id), throwsArgumentError);
    expect(
      () => panelPush(stack, 'd', (id) => id, after: 'missing'),
      throwsArgumentError,
    );
  });

  testWidgets('nested requests use one controlled host and close descendants', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(1400, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    var panels = <PanelEntry>[];
    PanelEntry entry(String id) => PanelEntry(
      id: id,
      panel: Panel(
        label: id,
        title: Text(id),
        child: Builder(
          builder: (context) => GestureDetector(
            onTap: () => PanelScope.of(context).push(
              PanelEntry(
                id: '$id-child',
                panel: Panel(
                  label: '$id-child',
                  child: const Text('Deep content'),
                ),
              ),
            ),
            child: Text('Push from $id'),
          ),
        ),
      ),
    );
    await tester.pumpWidget(
      host(
        config: const ThemeConfig(motion: Motion.none),
        StatefulBuilder(
          builder: (context, setState) => PanelHost(
            root: Panel(
              label: 'Root',
              child: Builder(
                builder: (context) => GestureDetector(
                  onTap: () => PanelScope.of(context).push(entry('a')),
                  child: const Text('Open'),
                ),
              ),
            ),
            panels: panels,
            onPanelsChange: (next) => setState(() => panels = next),
          ),
        ),
      ),
    );
    await tester.tap(find.text('Open'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Push from a'));
    await tester.pumpAndSettle();
    expect(panels.map((p) => p.id), ['a', 'a-child']);
    expect(find.byType(PanelHost), findsOneWidget);
    PanelScope.of(tester.element(find.text('Push from a'))).close!();
    await tester.pumpAndSettle();
    expect(panels, isEmpty);
    expect(tester.takeException(), isNull);
  });

  testWidgets('compact close reveals previous sheet and preserves its draft', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    final probe = GlobalKey<_ProbeState>();
    var mounts = 0;
    var disposals = 0;
    var panels = <PanelEntry>[
      PanelEntry(
        id: 'app',
        panel: Panel(
          label: 'App',
          title: const Text('App'),
          child: _Probe(
            key: probe,
            onMount: () => mounts++,
            onDispose: () => disposals++,
          ),
        ),
      ),
      const PanelEntry(
        id: 'owner',
        panel: Panel(
          label: 'Owner',
          title: Text('Owner'),
          child: Text('Owner content'),
        ),
      ),
    ];
    await tester.pumpWidget(
      host(
        config: const ThemeConfig(motion: Motion.none),
        StatefulBuilder(
          builder: (context, setState) => PanelHost(
            root: const Panel(label: 'Apps', child: Text('Apps list')),
            panels: panels,
            onPanelsChange: (next) => setState(() => panels = next),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    final original = probe.currentState!;
    original.draft = 'Still editing';
    expect(find.byType(Sheet), findsNWidgets(2));
    PanelScope.of(tester.element(find.text('Owner content'))).close!();
    await tester.pumpAndSettle();
    expect(panels.map((entry) => entry.id), ['app']);
    expect(find.byType(Sheet), findsOneWidget);
    expect(probe.currentState, same(original));
    expect(original.draft, 'Still editing');
    expect(mounts, 1);
    expect(disposals, 0);
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'dismissal guards protect descendants and dedupe pending closes',
    (tester) async {
      tester.view.physicalSize = const Size(1400, 900);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);
      final decision = Completer<bool>();
      var calls = 0;
      var panels = <PanelEntry>[
        const PanelEntry(
          id: 'app',
          panel: Panel(label: 'App', child: Text('App body')),
        ),
        PanelEntry(
          id: 'draft',
          canClose: () {
            calls++;
            return decision.future;
          },
          panel: const Panel(label: 'Draft', child: Text('Draft body')),
        ),
      ];
      await tester.pumpWidget(
        host(
          config: const ThemeConfig(motion: Motion.none),
          StatefulBuilder(
            builder: (context, setState) => PanelHost(
              root: const Panel(label: 'Root', child: Text('Root body')),
              panels: panels,
              onPanelsChange: (next) => setState(() => panels = next),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      final close = PanelScope.of(tester.element(find.text('App body'))).close!;
      close();
      close();
      await tester.pump();
      expect(calls, 1);
      expect(panels.length, 2);
      decision.complete(false);
      await tester.pumpAndSettle();
      expect(panels.length, 2);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('header actions retain their state across modes', (tester) async {
    tester.view.physicalSize = const Size(1400, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    var width = 1200.0;
    late StateSetter resize;
    var mounts = 0;
    var disposals = 0;
    await tester.pumpWidget(
      host(
        config: const ThemeConfig(motion: Motion.none),
        StatefulBuilder(
          builder: (context, setState) {
            resize = setState;
            return Center(
              child: SizedBox(
                width: width,
                height: 800,
                child: PanelHost(
                  root: const Panel(label: 'Root', child: Text('Root')),
                  panels: [
                    PanelEntry(
                      id: 'detail',
                      panel: Panel(
                        label: 'Detail',
                        trailing: [
                          SizedBox(
                            width: 40,
                            height: 40,
                            child: _Probe(
                              onMount: () => mounts++,
                              onDispose: () => disposals++,
                            ),
                          ),
                        ],
                        child: const Text('Body'),
                      ),
                    ),
                  ],
                  onPanelsChange: (_) {},
                ),
              ),
            );
          },
        ),
      ),
    );
    await tester.pumpAndSettle();
    resize(() => width = 390);
    await tester.pumpAndSettle();
    expect(mounts, 1);
    expect(disposals, 0);
  });

  testWidgets(
    'draft, scroll and subscription survive repeated local resizing',
    (tester) async {
      tester.view.physicalSize = const Size(1400, 900);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);
      var width = 1200.0;
      late StateSetter resize;
      var mounts = 0;
      var disposals = 0;
      final probe = GlobalKey<_ProbeState>();
      await tester.pumpWidget(
        host(
          config: const ThemeConfig(motion: Motion.none),
          StatefulBuilder(
            builder: (context, setState) {
              resize = setState;
              return Center(
                child: SizedBox(
                  width: width,
                  height: 800,
                  child: PanelHost(
                    root: const Panel(
                      label: 'Root',
                      child: Text('Root content'),
                    ),
                    panels: [
                      PanelEntry(
                        id: 'detail',
                        panel: Panel(
                          label: 'Detail',
                          title: const Text('Detail'),
                          child: _Probe(
                            key: probe,
                            onMount: () => mounts++,
                            onDispose: () => disposals++,
                          ),
                        ),
                      ),
                    ],
                    onPanelsChange: (_) {},
                  ),
                ),
              );
            },
          ),
        ),
      );
      await tester.pumpAndSettle();
      final original = probe.currentState!;
      original.draft = 'Unsaved draft';
      final scroll = tester
          .state<ScrollableState>(
            find
                .descendant(
                  of: find.byType(Panel).last,
                  matching: find.byType(Scrollable),
                )
                .first,
          )
          .position;
      scroll.jumpTo(180);
      await tester.pump();
      for (final next in [390.0, 1200.0, 450.0, 1200.0]) {
        resize(() => width = next);
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        expect(probe.currentState, same(original));
        expect(original.draft, 'Unsaved draft');
        expect(mounts, 1);
        expect(disposals, 0);
        final currentScroll = tester
            .state<ScrollableState>(
              find
                  .descendant(
                    of: find.byType(Panel).last,
                    matching: find.byType(Scrollable),
                  )
                  .first,
            )
            .position;
        expect(currentScroll.pixels, closeTo(180, 0.1));
      }
    },
  );
}

class _Probe extends StatefulWidget {
  const _Probe({super.key, required this.onMount, required this.onDispose});
  final VoidCallback onMount;
  final VoidCallback onDispose;
  @override
  State<_Probe> createState() => _ProbeState();
}

class _ProbeState extends State<_Probe> {
  String draft = '';
  @override
  void initState() {
    super.initState();
    widget.onMount();
  }

  @override
  void dispose() {
    widget.onDispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) =>
      const SizedBox(height: 2000, child: Text('Draft body'));
}
