import 'package:feeef_ui/motion.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

import 'widgets_test.dart' show host;

double opacityOf(WidgetTester tester, Finder finder) {
  var value = 1.0;
  for (final o in tester.widgetList<Opacity>(
    find.ancestor(of: finder, matching: find.byType(Opacity)),
  )) {
    value *= o.opacity;
  }
  for (final f in tester.widgetList<FadeTransition>(
    find.ancestor(of: finder, matching: find.byType(FadeTransition)),
  )) {
    value *= f.opacity.value;
  }
  return value;
}

class _Probe extends StatelessWidget {
  const _Probe(this.label, this.onState);
  final String label;
  final ValueChanged<PresenceState> onState;
  @override
  Widget build(BuildContext context) {
    onState(Presence.stateOf(context));
    return Text(label);
  }
}

void main() {
  testWidgets('PresenceBuilder stays mounted through the exit, then unmounts', (
    tester,
  ) async {
    final seen = <String>[];
    Widget build(bool open) => host(
      PresenceBuilder(
        open: open,
        exitMs: 200,
        builder: (context, mounted, state) {
          seen.add('$mounted ${state.name}');
          return mounted ? const Text('panel') : const SizedBox();
        },
      ),
    );
    await tester.pumpWidget(build(true));
    expect(seen.last, 'true open');
    await tester.pumpWidget(build(false));
    expect(seen.last, 'true closed');
    await tester.pump(const Duration(milliseconds: 199));
    expect(find.text('panel'), findsOneWidget);
    await tester.pump(const Duration(milliseconds: 2));
    expect(seen.last, 'false closed');
    expect(find.text('panel'), findsNothing);
    await tester.pumpWidget(build(true));
    expect(seen.last, 'true open');
  });

  testWidgets('PresenceBuilder unmounts at once under reduced motion', (
    tester,
  ) async {
    Widget build(bool open) => MediaQuery(
      data: const MediaQueryData(disableAnimations: true),
      child: host(
        PresenceBuilder(
          open: open,
          builder: (context, mounted, state) =>
              mounted ? const Text('panel') : const SizedBox(),
        ),
      ),
    );
    await tester.pumpWidget(build(true));
    await tester.pumpWidget(build(false));
    await tester.pump(Duration.zero);
    expect(find.text('panel'), findsNothing);
  });

  testWidgets('Presence freezes the last open output and marks it closed', (
    tester,
  ) async {
    var label = 'first';
    PresenceState? state;
    Widget build(bool open) => host(
      Presence(
        open: open,
        exitMs: 160,
        render: (_) => _Probe(label, (value) => state = value),
      ),
    );
    await tester.pumpWidget(build(true));
    expect(state, PresenceState.open);
    label = 'second';
    await tester.pumpWidget(build(false));
    // The closing frame keeps the last open output, not the new label.
    expect(find.text('first'), findsOneWidget);
    expect(state, PresenceState.closed);
    await tester.pump(const Duration(milliseconds: 161));
    expect(find.text('first'), findsNothing);
  });

  testWidgets('PresenceTransition plays the menu keyframes in and out', (
    tester,
  ) async {
    Widget build(PresenceState state) => host(
      PresenceTransition(
        motion: PresenceMotion.menu,
        state: state,
        child: const Text('menu'),
      ),
    );
    await tester.pumpWidget(build(PresenceState.open));
    expect(opacityOf(tester, find.text('menu')), closeTo(0, 1e-9));
    await tester.pump(const Duration(milliseconds: 100));
    final mid = opacityOf(tester, find.text('menu'));
    expect(mid, greaterThan(0.5));
    expect(mid, lessThan(1));
    await tester.pump(const Duration(milliseconds: 120));
    expect(opacityOf(tester, find.text('menu')), 1);
    await tester.pumpWidget(build(PresenceState.closed));
    await tester.pump(const Duration(milliseconds: 150));
    expect(opacityOf(tester, find.text('menu')), closeTo(0, 1e-9));
  });

  testWidgets('StableText keeps the widest option\'s width and shows one', (
    tester,
  ) async {
    Widget build(String value) => host(
      StableText(
        value: value,
        options: const ['Play', 'Generating…'],
        style: const TextStyle(fontSize: 14),
      ),
    );
    await tester.pumpWidget(build('Play'));
    final wide = tester.getSize(find.byType(StableText)).width;
    expect(wide, tester.getSize(find.text('Generating…')).width);
    await tester.pumpWidget(build('Generating…'));
    await tester.pump(const Duration(milliseconds: 300));
    expect(tester.getSize(find.byType(StableText)).width, wide);
    expect(opacityOf(tester, find.text('Generating…')), 1);
    expect(opacityOf(tester, find.text('Play')), 0);
    // A value outside the options is added to the cell.
    await tester.pumpWidget(build('Stop'));
    expect(find.text('Stop'), findsOneWidget);
  });

  testWidgets('AutoHeight eases to the new content height over 320ms', (
    tester,
  ) async {
    Widget build(double height) => host(
      SizedBox(
        width: 200,
        child: AutoHeight(child: SizedBox(height: height)),
      ),
    );
    await tester.pumpWidget(build(100));
    await tester.pump();
    expect(tester.getSize(find.byType(AutoHeight)).height, 100);
    await tester.pumpWidget(build(300));
    // The box keeps its height for the frame the content changed in.
    expect(tester.getSize(find.byType(AutoHeight)).height, 100);
    await tester.pump(const Duration(milliseconds: 16));
    await tester.pump(const Duration(milliseconds: 100));
    final mid = tester.getSize(find.byType(AutoHeight)).height;
    expect(mid, greaterThan(100));
    expect(mid, lessThan(300));
    await tester.pump(const Duration(milliseconds: 400));
    expect(tester.getSize(find.byType(AutoHeight)).height, 300);
  });

  testWidgets('Swap cross-fades the old icon out and drops it after 220ms', (
    tester,
  ) async {
    Widget build(String key) => host(Swap(swapKey: key, child: Text(key)));
    await tester.pumpWidget(build('play'));
    await tester.pump(const Duration(milliseconds: 300));
    expect(opacityOf(tester, find.text('play')), 1);
    await tester.pumpWidget(build('pause'));
    expect(find.text('play'), findsOneWidget);
    expect(find.text('pause'), findsOneWidget);
    await tester.pump(const Duration(milliseconds: 170));
    expect(opacityOf(tester, find.text('play')), closeTo(0, 1e-9));
    await tester.pump(const Duration(milliseconds: 60));
    expect(find.text('play'), findsNothing);
    expect(opacityOf(tester, find.text('pause')), 1);
    // Same-key updates replace the child in place.
    await tester.pumpWidget(build('pause'));
    expect(find.text('pause'), findsOneWidget);
  });
}
