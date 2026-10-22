import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart' hide RadioGroup;
import 'package:flutter_test/flutter_test.dart';

/// Loaders, hints and popover grain animate; pump fixed steps instead of settling.
Future<void> settle(WidgetTester tester, [int steps = 12]) async {
  for (var i = 0; i < steps; i++) {
    await tester.pump(const Duration(milliseconds: 50));
  }
}

/// Glass springs keep running for a moment after the last change: unmount and let them rest.
Future<void> finish(WidgetTester tester) async {
  await tester.pumpWidget(const SizedBox());
  await settle(tester, 40);
}

Widget app(
  Widget child, {
  TextDirection direction = TextDirection.ltr,
  double width = 560,
}) => WidgetsApp(
  color: const Color(0xFF000000),
  builder: (context, _) => Directionality(
    textDirection: direction,
    child: FocusScope(
      autofocus: true,
      child: ThemeProvider(
        brightness: Brightness.light,
        // Overlay keeps its first entries: a new one per pump shows the new child.
        child: Overlay(
          key: UniqueKey(),
          initialEntries: [
            OverlayEntry(
              builder: (context) => Center(
                child: SizedBox(width: width, child: child),
              ),
            ),
          ],
        ),
      ),
    ),
  ),
);

class _Chat extends StatefulWidget {
  _Chat({this.onSubmit, this.busy = false, this.initial = ''})
    : super(key: ValueKey(initial));
  final VoidCallback? onSubmit;
  final bool busy;
  final String initial;
  @override
  State<_Chat> createState() => _ChatState();
}

class _ChatState extends State<_Chat> {
  late String value = widget.initial;
  @override
  Widget build(BuildContext context) => PromptComposer(
    label: 'Message',
    placeholder: 'Ask anything',
    value: value,
    busy: widget.busy,
    onValueChange: (next) => setState(() => value = next),
    onSubmit: widget.onSubmit ?? () {},
    tools: [
      IconButton(
        variant: .ghost,
        appearance: .toolbar,
        ariaLabel: 'Attach',
        onClick: () {},
        icon: const LucideIcon(LucideIcons.paperclip),
      ),
    ],
    submit: IconButton(
      variant: .filled,
      ariaLabel: 'Send',
      onClick: () {},
      icon: const LucideIcon(LucideIcons.arrowUp),
    ),
  );
}

void main() {
  group('PromptComposer', () {
    testWidgets('typing reports the text; Enter sends, Shift+Enter does not', (
      tester,
    ) async {
      var sent = 0;
      await tester.pumpWidget(app(_Chat(onSubmit: () => sent++)));
      await settle(tester);
      await tester.tap(find.byType(EditableText));
      await tester.pump();
      // A blank prompt never sends.
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      expect(sent, 0);
      await tester.enterText(find.byType(EditableText), 'Hello');
      await tester.pump();
      expect(find.text('Hello'), findsOneWidget);
      await tester.sendKeyDownEvent(LogicalKeyboardKey.shiftLeft);
      final handled = await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.sendKeyUpEvent(LogicalKeyboardKey.shiftLeft);
      expect(handled, isFalse, reason: 'Shift+Enter is left to the input');
      expect(sent, 0);
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      expect(sent, 1);
      await finish(tester);
    }, variant: TargetPlatformVariant.only(TargetPlatform.macOS));

    testWidgets('busy blocks sending and makes the field read-only', (
      tester,
    ) async {
      var sent = 0;
      await tester.pumpWidget(
        app(_Chat(onSubmit: () => sent++, busy: true, initial: 'Hi')),
      );
      await settle(tester);
      expect(
        tester.widget<EditableText>(find.byType(EditableText)).readOnly,
        isTrue,
      );
      await tester.tap(find.byType(EditableText));
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      expect(sent, 0);
      await finish(tester);
    }, variant: TargetPlatformVariant.only(TargetPlatform.macOS));

    testWidgets(
      'one row while the text fits; the field takes its own row after',
      (tester) async {
        await tester.pumpWidget(app(_Chat(initial: 'Short')));
        await settle(tester);
        final field = tester.getRect(find.byType(EditableText));
        final send = tester.getRect(find.bySemanticsLabel('Send'));
        expect((field.center.dy - send.center.dy).abs(), lessThan(4));
        expect(
          field.left,
          greaterThan(tester.getRect(find.bySemanticsLabel('Attach')).right),
        );

        await tester.pumpWidget(app(_Chat(initial: 'A long prompt ' * 12)));
        await settle(tester);
        final wide = tester.getRect(find.byType(EditableText));
        final below = tester.getRect(find.bySemanticsLabel('Send'));
        expect(below.top, greaterThan(wide.bottom));
        expect(
          tester.getRect(find.bySemanticsLabel('Attach')).top,
          greaterThan(wide.bottom),
        );

        // A line break expands even when the text is short.
        await tester.pumpWidget(app(_Chat(initial: 'a\nb')));
        await settle(tester);
        expect(
          tester.getRect(find.bySemanticsLabel('Send')).top,
          greaterThan(tester.getRect(find.byType(EditableText)).top + 20),
        );
        await finish(tester);
      },
      variant: TargetPlatformVariant.only(TargetPlatform.macOS),
    );

    testWidgets('right to left: tools at the right, send at the left', (
      tester,
    ) async {
      await tester.pumpWidget(
        app(_Chat(initial: 'Short'), direction: TextDirection.rtl),
      );
      await settle(tester);
      final attach = tester.getRect(find.bySemanticsLabel('Attach'));
      final send = tester.getRect(find.bySemanticsLabel('Send'));
      expect(attach.left, greaterThan(send.right));
      await finish(tester);
    }, variant: TargetPlatformVariant.only(TargetPlatform.macOS));

    testWidgets(
      'the field is a labelled multiline text field; the hint is decorative',
      (tester) async {
        final handle = tester.ensureSemantics();
        await tester.pumpWidget(app(_Chat()));
        await settle(tester, 30);
        expect(
          tester.getSemantics(find.byType(RawInput)),
          isSemantics(
            label: 'Message',
            isTextField: true,
            isMultiline: true,
            isEnabled: true,
          ),
        );
        expect(find.bySemanticsLabel('Ask anything'), findsNothing);
        await finish(tester);
        handle.dispose();
      },
      variant: TargetPlatformVariant.only(TargetPlatform.macOS),
    );
  });

  group('ImagePromptComposer', () {
    Widget composer({
      List<ComposerReference> references = const [
        ComposerReference(id: 'a', url: '', name: 'Bottle'),
        ComposerReference(id: 'b', url: '', name: 'Label'),
      ],
      ValueChanged<String>? onRemove,
      ValueChanged<ComposerTemplate>? onTemplate,
      VoidCallback? onSubmit,
      String prompt = '',
      ValueChanged<String>? onPrompt,
      ValueChanged<EnhanceMode>? onEnhance,
      bool submitDisabled = false,
    }) => ImagePromptComposer(
      mode: .image,
      prompt: prompt,
      onPrompt: onPrompt ?? (_) {},
      placeholder: 'Describe the image you want',
      maxLength: 2000,
      references: references,
      referenceLimit: const ReferenceLimit(max: 3, formats: ['image/png']),
      onAddFiles: (_) {},
      onRemoveReference: onRemove ?? (_) {},
      recent: const [],
      onUseRecent: (_) {},
      onEditPhoto: (_) {},
      templates: const [
        ComposerTemplate(
          id: 'studio',
          name: 'Studio shot',
          prompt: 'Studio prompt',
        ),
        ComposerTemplate(id: 'life', name: 'Lifestyle', prompt: 'Life prompt'),
      ],
      onTemplate: onTemplate ?? (_) {},
      ladder: (variant) => const SizedBox(width: 40, height: 40),
      settings: const Text('Shape options'),
      settingsLabel: '1:1',
      enhancing: null,
      onEnhance: onEnhance,
      onSubmit: onSubmit ?? () {},
      submitDisabled: submitDisabled,
      submitting: false,
      submitLabel: 'Create image',
      caption: const Text('About 4 DZD'),
    );

    testWidgets('reference chips name the main image and remove by id', (
      tester,
    ) async {
      String? removed;
      await tester.pumpWidget(app(composer(onRemove: (id) => removed = id)));
      await settle(tester);
      expect(find.text('Main image'), findsOneWidget);
      expect(find.text('Label'), findsOneWidget);
      await tester.tap(find.bySemanticsLabel('Remove Label'));
      expect(removed, 'b');
      await finish(tester);
    }, variant: TargetPlatformVariant.only(TargetPlatform.macOS));

    testWidgets('no attachment row without references or a template', (
      tester,
    ) async {
      await tester.pumpWidget(app(composer(references: const [])));
      await settle(tester);
      expect(find.text('Main image'), findsNothing);
      expect(find.bySemanticsLabel('Reference images'), findsNothing);
      await finish(tester);
    }, variant: TargetPlatformVariant.only(TargetPlatform.macOS));

    testWidgets('the + menu opens, moves by keyboard and picks an idea', (
      tester,
    ) async {
      ComposerTemplate? picked;
      await tester.pumpWidget(app(composer(onTemplate: (t) => picked = t)));
      await settle(tester);
      await tester.tap(find.bySemanticsLabel('Add'));
      await settle(tester);
      expect(find.text('References · up to 3'), findsOneWidget);
      // Without a file picker or clipboard the upload entries are disabled.
      expect(find.text('Upload images'), findsOneWidget);
      await tester.tap(find.text('Start from an idea'));
      await settle(tester);
      expect(find.text('Studio shot'), findsOneWidget);
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowDown);
      await tester.pump();
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await settle(tester);
      expect(picked?.id, 'life');
      expect(find.text('References · up to 3'), findsNothing);
      await finish(tester);
    }, variant: TargetPlatformVariant.only(TargetPlatform.macOS));

    testWidgets('Escape closes the menu', (tester) async {
      await tester.pumpWidget(app(composer()));
      await settle(tester);
      await tester.tap(find.bySemanticsLabel('Add'));
      await settle(tester);
      expect(find.text('Edit a photo…'), findsOneWidget);
      await tester.sendKeyEvent(LogicalKeyboardKey.escape);
      await settle(tester);
      expect(find.text('Edit a photo…'), findsNothing);
      await finish(tester);
    }, variant: TargetPlatformVariant.only(TargetPlatform.macOS));

    testWidgets('the settings popover shows the panel and closes', (
      tester,
    ) async {
      await tester.pumpWidget(app(composer()));
      await settle(tester);
      await tester.tap(find.bySemanticsLabel('Output settings: 1:1'));
      await settle(tester);
      expect(find.text('Shape options'), findsOneWidget);
      expect(find.text('Output settings'), findsWidgets);
      await tester.tap(find.bySemanticsLabel('Close output settings'));
      await settle(tester);
      expect(find.text('Shape options'), findsNothing);
      await finish(tester);
    }, variant: TargetPlatformVariant.only(TargetPlatform.macOS));

    testWidgets(
      'Enter sends unless sending is disabled; the wand suggests ideas when empty',
      (tester) async {
        var sent = 0;
        EnhanceMode? wand;
        await tester.pumpWidget(
          app(
            composer(
              prompt: 'A vase',
              onSubmit: () => sent++,
              onEnhance: (mode) => wand = mode,
            ),
          ),
        );
        await settle(tester);
        await tester.tap(find.byType(EditableText));
        await tester.sendKeyEvent(LogicalKeyboardKey.enter);
        expect(sent, 1);
        await tester.tap(find.bySemanticsLabel('Improve my prompt'));
        expect(wand, EnhanceMode.enhance);

        await tester.pumpWidget(
          app(
            composer(
              onSubmit: () => sent++,
              submitDisabled: true,
              onEnhance: (mode) => wand = mode,
            ),
          ),
        );
        await settle(tester);
        await tester.tap(find.byType(EditableText));
        await tester.sendKeyEvent(LogicalKeyboardKey.enter);
        expect(sent, 1);
        await tester.tap(find.bySemanticsLabel('Suggest ideas'));
        expect(wand, EnhanceMode.ideas);
        await finish(tester);
      },
      variant: TargetPlatformVariant.only(TargetPlatform.macOS),
    );

    testWidgets('the caption shows only while the composer has focus', (
      tester,
    ) async {
      await tester.pumpWidget(app(composer()));
      await settle(tester);
      double opacity() => tester
          .widget<AnimatedOpacity>(
            find.ancestor(
              of: find.text('About 4 DZD'),
              matching: find.byType(AnimatedOpacity),
            ),
          )
          .opacity;
      expect(opacity(), 0);
      await tester.tap(find.byType(EditableText));
      await settle(tester);
      expect(opacity(), 1);
      await finish(tester);
    }, variant: TargetPlatformVariant.only(TargetPlatform.macOS));
  });
}
