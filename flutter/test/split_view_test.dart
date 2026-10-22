import 'package:feeef_ui/containers/navigation_stack.dart';
import 'package:feeef_ui/containers/split_view.dart';
import 'package:feeef_ui/physics/spring.dart';
import 'package:feeef_ui/theme.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

Widget app(Widget child, {TextDirection direction = TextDirection.ltr}) =>
    WidgetsApp(
      color: const Color(0xFF000000),
      builder: (context, _) => Directionality(
        textDirection: direction,
        child: FocusScope(
          autofocus: true,
          child: ThemeProvider(
            brightness: Brightness.light,
            child: Overlay(
              initialEntries: [OverlayEntry(builder: (_) => child)],
            ),
          ),
        ),
      ),
    );

class Mail extends StatefulWidget {
  const Mail({super.key, this.widths, this.direction});
  final List<double>? widths;
  final TextDirection? direction;
  @override
  State<Mail> createState() => _MailState();
}

class _MailState extends State<Mail> {
  String? open;
  @override
  Widget build(BuildContext context) => SplitView(
    onBack: () => setState(() => open = null),
    onListWidthChange: widget.widths?.add,
    placeholder: const SplitPlaceholder(title: Text('Select a message')),
    list: NavigationPage(
      key: const ValueKey('inbox'),
      title: 'Inbox',
      child: GestureDetector(
        onTap: () => setState(() => open = 'Hello'),
        child: const Text('Row Hello'),
      ),
    ),
    detail: [
      if (open != null)
        NavigationPage(
          key: ValueKey(open),
          title: open!,
          child: Text('$open body'),
        ),
    ],
  );
}

void main() {
  test('widths clamp and round like Math.round', () {
    expect(jsRound(2.5), 3);
    expect(jsRound(-2.5), -2);
    expect(jsRound(-2.6), -3);
    expect(splitListWidth(100, 280, 520), 280);
    expect(splitListWidth(600, 280, 520), 520);
    expect(splitListWidth(300.5, 280, 520), 301);
    expect(rubberBandClamp(300, 280, 520, 240), 300);
    expect(rubberBandClamp(600, 280, 520, 240), lessThan(600));
    expect(rubberBandClamp(600, 280, 520, 240), greaterThan(520));
  });

  testWidgets('wide: list beside the detail; selecting fills the detail', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(1200, 800));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await tester.pumpWidget(app(const Mail()));
    await tester.pumpAndSettle();
    expect(find.text('Select a message'), findsOneWidget);
    expect(find.text('Row Hello'), findsOneWidget);
    await tester.tap(find.text('Row Hello'));
    await tester.pumpAndSettle();
    expect(find.text('Hello body'), findsOneWidget);
    expect(find.text('Row Hello'), findsOneWidget, reason: 'list stays');
    expect(tester.getTopLeft(find.text('Hello body')).dx, 360 + 24);
  });

  testWidgets('the divider drags, steps with the keyboard and clamps', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(1200, 800));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    final semantics = tester.ensureSemantics();
    final widths = <double>[];
    await tester.pumpWidget(app(Mail(widths: widths)));
    await tester.pumpAndSettle();
    final divider = find.bySemanticsLabel('Resize the list');
    expect(divider, findsOneWidget);
    expect(tester.getCenter(divider).dx, 360);

    await tester.drag(divider, const Offset(50, 0));
    await tester.pumpAndSettle();
    expect(widths.last, 410);
    expect(tester.getCenter(divider).dx, 410);

    // Past the limit it rubber-bands, then springs back to the bound.
    await tester.drag(divider, const Offset(400, 0));
    await tester.pumpAndSettle();
    expect(widths.last, 520);
    expect(tester.getCenter(divider).dx, 520);

    tester
        .widget<Focus>(
          find.descendant(of: divider, matching: find.byType(Focus)).first,
        )
        .focusNode!
        .requestFocus();
    await tester.pump();
    await tester.sendKeyEvent(LogicalKeyboardKey.arrowLeft);
    await tester.pumpAndSettle();
    expect(widths.last, 496);
    await tester.sendKeyEvent(LogicalKeyboardKey.home);
    await tester.pumpAndSettle();
    expect(widths.last, 280);
    expect(tester.getCenter(divider).dx, 280);
    semantics.dispose();
  });

  testWidgets('RTL: dragging toward the left widens the list', (tester) async {
    await tester.binding.setSurfaceSize(const Size(1200, 800));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    final semantics = tester.ensureSemantics();
    final widths = <double>[];
    await tester.pumpWidget(
      app(Mail(widths: widths), direction: TextDirection.rtl),
    );
    await tester.pumpAndSettle();
    final divider = find.bySemanticsLabel('Resize the list');
    expect(tester.getCenter(divider).dx, 1200 - 360);
    await tester.drag(divider, const Offset(-40, 0));
    await tester.pumpAndSettle();
    expect(widths.last, 400);
    semantics.dispose();
  });

  testWidgets(
    'narrow: one stack, the detail pushes over the list and goes back',
    (tester) async {
      await tester.binding.setSurfaceSize(const Size(500, 800));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      final semantics = tester.ensureSemantics();
      await tester.pumpWidget(app(const Mail()));
      await tester.pumpAndSettle();
      expect(find.text('Select a message'), findsNothing);
      expect(find.bySemanticsLabel('Resize the list'), findsNothing);
      await tester.tap(find.text('Row Hello'));
      await tester.pumpAndSettle();
      expect(find.text('Hello body'), findsOneWidget);
      expect(find.text('Row Hello'), findsNothing, reason: 'covered');
      await tester.tap(find.bySemanticsLabel('Back to Inbox'));
      await tester.pumpAndSettle();
      expect(find.text('Hello body', skipOffstage: false), findsNothing);
      expect(find.text('Row Hello'), findsOneWidget);
      semantics.dispose();
    },
  );
}
