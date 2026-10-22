import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart' hide RadioGroup;
import 'package:flutter_test/flutter_test.dart';

import 'composer_test.dart' show app, finish, settle;

const _created = '2026-10-22T08:00:00.000Z';
final _now = DateTime.parse(_created).millisecondsSinceEpoch + 12000;

ImageTake take(String id, TakeStatus status, [String ratio = '1:1']) =>
    ImageTake(
      id: id,
      status: status,
      createdAt: _created,
      options: ImageOptions(aspectRatio: ratio),
      error: status == TakeStatus.failed
          ? 'The model did not return an image.'
          : null,
    );

Widget board({
  List<ImageTake>? takes,
  String? selected,
  ValueChanged<String>? onSelect,
  ValueChanged<ImageTake>? onRetry,
  ValueChanged<ImageTake>? onRemove,
  ValueChanged<String>? onStarter,
}) => SizedBox(
  height: 500,
  child: FreeformBoard(
    embedded: true,
    takes:
        takes ??
        [
          take('c', TakeStatus.processing),
          take('b', TakeStatus.completed, '4:5'),
          take('a', TakeStatus.completed),
        ],
    selectedId: selected,
    onSelect: onSelect ?? (_) {},
    insets: (top: 12, right: 12, bottom: 12, left: 12),
    now: _now,
    signedIn: true,
    starters: const [(label: 'Flat lay', prompt: 'A flat lay')],
    onStarter: onStarter ?? (_) {},
    onRetry: onRetry ?? (_) {},
    onRemove: onRemove ?? (_) {},
    imageBuilder: (context, take) =>
        SizedBox.expand(key: ValueKey('art-${take.id}')),
  ),
);

String percent(WidgetTester tester) =>
    tester.widgetList<Text>(find.textContaining('%')).map((t) => t.data!).first;

void main() {
  testWidgets('versions sit oldest first; the newest is selected and fitted', (
    tester,
  ) async {
    await tester.pumpWidget(app(board(), width: 800));
    await settle(tester);
    final a = tester.getRect(find.byKey(const ValueKey('art-a')));
    final b = tester.getRect(find.byKey(const ValueKey('art-b')));
    expect(a.left, lessThan(b.left));
    expect(b.width / b.height, closeTo(0.8, 0.01));
    expect(find.text('Created #3'), findsOneWidget);
    expect(find.text('Taking shape…'), findsOneWidget);
    expect(find.text('12s · usually 10–40 s'), findsOneWidget);
    await finish(tester);
  }, variant: TargetPlatformVariant.only(TargetPlatform.macOS));

  testWidgets('a board laid out at zero size first fits its real size', (
    tester,
  ) async {
    await tester.pumpWidget(app(board(), width: 800));
    await settle(tester);
    final expected = percent(tester);
    // Same board, first laid out with no room (a hidden host, a page still sizing itself).
    final height = ValueNotifier<double>(0);
    await tester.pumpWidget(
      app(
        ValueListenableBuilder<double>(
          valueListenable: height,
          builder: (context, value, child) =>
              SizedBox(height: value, child: child),
          child: KeyedSubtree(key: const ValueKey('fresh'), child: board()),
        ),
        width: 800,
      ),
    );
    await tester.pump();
    height.value = 500;
    // The first real fit snaps: right on the next frame, no glide from a zero-size fit.
    await tester.pump();
    expect(percent(tester), expected);
    await finish(tester);
  }, variant: TargetPlatformVariant.only(TargetPlatform.macOS));

  testWidgets('a click selects a card; a drag pans without selecting', (
    tester,
  ) async {
    final picked = <String>[];
    await tester.pumpWidget(app(board(onSelect: picked.add), width: 800));
    await settle(tester);
    final a = find.byKey(const ValueKey('art-b'));
    final before = tester.getRect(a);
    await tester.tapAt(before.center);
    await tester.pump();
    expect(picked, ['b']);
    await settle(tester, 20);
    await tester.dragFrom(before.center, const Offset(60, 20));
    await tester.pump();
    final moved = tester.getRect(a);
    final after = moved;
    expect(after.left - before.left, closeTo(60, 1));
    expect(after.top - before.top, closeTo(20, 1));
    expect(picked, ['b']);
    await finish(tester);
  }, variant: TargetPlatformVariant.only(TargetPlatform.macOS));

  testWidgets('zoom buttons, Ctrl+scroll and plain scroll', (tester) async {
    await tester.pumpWidget(app(board(), width: 800));
    await settle(tester);
    final start = percent(tester);
    await tester.tap(find.bySemanticsLabel('Zoom in'));
    await tester.pump();
    final zoomed = int.parse(percent(tester).replaceAll('%', ''));
    expect(zoomed, greaterThan(int.parse(start.replaceAll('%', ''))));
    await tester.tap(find.bySemanticsLabel('Zoom out'));
    await tester.pump();
    expect(percent(tester), start);

    final card = find.byKey(const ValueKey('art-a'));
    final before = tester.getRect(card);
    final pointer = TestPointer(1, PointerDeviceKind.mouse);
    await tester.sendEventToBinding(pointer.hover(const Offset(400, 300)));
    await tester.sendEventToBinding(pointer.scroll(const Offset(30, 10)));
    await tester.pump();
    final panned = tester.getRect(card);
    expect(before.left - panned.left, closeTo(30, 0.5));
    expect(before.top - panned.top, closeTo(10, 0.5));

    await tester.sendKeyDownEvent(LogicalKeyboardKey.controlLeft);
    await tester.sendEventToBinding(pointer.scroll(const Offset(0, -100)));
    await tester.sendKeyUpEvent(LogicalKeyboardKey.controlLeft);
    await tester.pump();
    expect(tester.getRect(card).width, greaterThan(panned.width));
    await finish(tester);
  }, variant: TargetPlatformVariant.only(TargetPlatform.macOS));

  testWidgets('show all fits every version; a double click fits one', (
    tester,
  ) async {
    await tester.pumpWidget(app(board(), width: 800));
    await settle(tester);
    await tester.tap(find.bySemanticsLabel('Show all versions'));
    await settle(tester, 20);
    final all = percent(tester);
    final b = tester.getRect(find.byKey(const ValueKey('art-b')));
    await tester.tapAt(b.center);
    await tester.pump(const Duration(milliseconds: 60));
    await tester.tapAt(b.center);
    await settle(tester, 20);
    expect(percent(tester), isNot(all));
    await finish(tester);
  }, variant: TargetPlatformVariant.only(TargetPlatform.macOS));

  testWidgets('failed takes offer Try again and Remove', (tester) async {
    ImageTake? retried, removed;
    await tester.pumpWidget(
      app(
        board(
          takes: [take('x', TakeStatus.failed)],
          onRetry: (t) => retried = t,
          onRemove: (t) => removed = t,
        ),
        width: 800,
      ),
    );
    await settle(tester);
    expect(find.text('That one didn’t work out.'), findsOneWidget);
    expect(find.text('The model did not return an image.'), findsOneWidget);
    await tester.tap(find.text('Try again'));
    await tester.tap(find.text('Remove'));
    expect(retried?.id, 'x');
    expect(removed?.id, 'x');
    await finish(tester);
  }, variant: TargetPlatformVariant.only(TargetPlatform.macOS));

  testWidgets('an empty board welcomes and offers starters', (tester) async {
    String? starter;
    await tester.pumpWidget(
      app(board(takes: const [], onStarter: (p) => starter = p), width: 800),
    );
    await settle(tester);
    expect(find.text('Your canvas is endless.'), findsOneWidget);
    expect(find.bySemanticsLabel('Zoom in'), findsNothing);
    await tester.tap(find.text('Flat lay'));
    expect(starter, 'A flat lay');
    await finish(tester);
  }, variant: TargetPlatformVariant.only(TargetPlatform.macOS));

  testWidgets(
    'the board is a labelled region; zoom buttons are reachable by keyboard',
    (tester) async {
      final handle = tester.ensureSemantics();
      await tester.pumpWidget(app(board(), width: 800));
      await settle(tester);
      expect(
        find.bySemanticsLabel(
          'Canvas. Drag to move, pinch or Ctrl+scroll to zoom.',
        ),
        findsOneWidget,
      );
      expect(find.bySemanticsLabel('Zoom'), findsOneWidget);
      final start = percent(tester);
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.pump();
      expect(percent(tester), isNot(start));
      await finish(tester);
      handle.dispose();
    },
    variant: TargetPlatformVariant.only(TargetPlatform.macOS),
  );

  testWidgets('right to left keeps the board physical; labels translate', (
    tester,
  ) async {
    await tester.pumpWidget(
      app(
        I18nProvider(locale: 'ar', child: board()),
        width: 800,
        direction: TextDirection.rtl,
      ),
    );
    await settle(tester);
    final a = tester.getRect(find.byKey(const ValueKey('art-a')));
    final b = tester.getRect(find.byKey(const ValueKey('art-b')));
    expect(a.left, lessThan(b.left));
    expect(find.textContaining('أُنشئت'), findsWidgets);
    await finish(tester);
  }, variant: TargetPlatformVariant.only(TargetPlatform.macOS));

  testWidgets('the workspace hands the board the chrome heights plus 24', (
    tester,
  ) async {
    late Insets seen;
    await tester.pumpWidget(
      app(
        SizedBox(
          height: 500,
          child: ImageWorkspace(
            top: const SizedBox(height: 40, width: 100),
            bottom: const SizedBox(height: 60),
            board: (insets) {
              seen = insets;
              return const SizedBox.expand();
            },
          ),
        ),
        width: 800,
      ),
    );
    await settle(tester, 3);
    expect(seen, (top: 64.0, right: 12.0, bottom: 84.0, left: 12.0));
    await finish(tester);
  }, variant: TargetPlatformVariant.only(TargetPlatform.macOS));
}
