import 'package:feeef_ui/feeef_ui.dart';

import 'dart:ui' show Tristate;

import 'package:flutter/rendering.dart' show RenderParagraph;
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
  _Chat({this.onSubmit, this.onStop, this.busy = false, this.initial = ''})
    : super(key: ValueKey(initial));
  final VoidCallback? onSubmit;
  final VoidCallback? onStop;
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
    onStop: widget.onStop,
    onValueChange: (next) => setState(() => value = next),
    onSubmit: widget.onSubmit ?? () {},
    submitLabel: 'Send',
    leading: IconButton(
      variant: .ghost,
      appearance: .toolbar,
      ariaLabel: 'Attach',
      onClick: () {},
      icon: const LucideIcon(LucideIcons.plus),
    ),
    tools: [
      Button(
        variant: .ghost,
        appearance: .toolbar,
        ariaLabel: 'Model',
        onClick: () {},
        children: const [Text('Smart')],
      ),
    ],
  );
}

/// The capsule: the glass group holding the field.
Rect capsule(WidgetTester tester) => tester.getRect(
  find
      .ancestor(
        of: find.byType(ComposerCapsuleLayout),
        matching: find.byType(GlassGroup),
      )
      .first,
);

bool toolsShown(WidgetTester tester) => !tester
    .widget<IgnorePointer>(
      find
          .ancestor(
            of: find.text('Smart'),
            matching: find.byType(IgnorePointer),
          )
          .first,
    )
    .ignoring;

void main() {
  group('composer model', () {
    test('the second row opens with text, focus or a pinned menu', () {
      expect(
        composerExpanded(hasText: false, focusWithin: false, pinned: false),
        isFalse,
      );
      expect(
        composerExpanded(hasText: true, focusWithin: false, pinned: false),
        isTrue,
      );
      expect(
        composerExpanded(hasText: false, focusWithin: true, pinned: false),
        isTrue,
      );
      expect(
        composerExpanded(hasText: false, focusWithin: false, pinned: true),
        isTrue,
      );
    });

    test('send states', () {
      expect(
        composerSendState(ready: false, submitting: false, stoppable: true),
        ComposerSendState.idle,
      );
      expect(
        composerSendState(ready: true, submitting: false, stoppable: false),
        ComposerSendState.ready,
      );
      expect(
        composerSendState(ready: true, submitting: true, stoppable: false),
        ComposerSendState.sending,
      );
      expect(
        composerSendState(ready: false, submitting: true, stoppable: true),
        ComposerSendState.stop,
      );
    });

    test('frames mix in capsule pixels; new slots fade in where they land', () {
      const ComposerLayoutSnapshot from = (
        height: 44,
        slots: {
          ComposerSlotName.field: (x: 0, y: 0, height: 38, opacity: 1),
          ComposerSlotName.send: (x: 300, y: 0, height: 38, opacity: 1),
        },
      );
      const ComposerLayoutSnapshot to = (
        height: 82,
        slots: {
          ComposerSlotName.field: (x: 0, y: 0, height: 38, opacity: 1),
          ComposerSlotName.send: (x: 300, y: 38, height: 38, opacity: 1),
          ComposerSlotName.tools: (x: 0, y: 38, height: 38, opacity: 1),
        },
      );
      final start = composerFrame(from, to, 0);
      expect(start.height, 44);
      expect(start.slots[ComposerSlotName.send]!.dy, -38);
      expect(start.slots[ComposerSlotName.tools]!.opacity, 0);
      final half = composerFrame(from, to, 0.5);
      expect(half.height, 63);
      expect(half.slots[ComposerSlotName.send]!.dy, -19);
      expect(half.slots[ComposerSlotName.tools]!.opacity, 0.5);
      final end = composerFrame(from, to, 1);
      expect(end.slots[ComposerSlotName.send]!.dy, 0);
      expect(composerSameLayout(from, to), isFalse);
      expect(composerSameLayout(to, to), isTrue);
      final mid = composerFrameSnapshot(from, to, 0.5);
      expect(mid.height, 63);
      expect(mid.slots[ComposerSlotName.send]!.y, 19);
    });
  });

  group('ComposerHint', () {
    testWidgets('an Arabic hint reads right to left, its question mark last', (
      tester,
    ) async {
      await tester.pumpWidget(
        app(
          const ComposerHint(text: 'ما الذي تريد تغييره في Hero؟'),
          direction: TextDirection.rtl,
        ),
      );
      await settle(tester, 30);
      final paragraph = tester.renderObject<RenderParagraph>(
        find
            .descendant(
              of: find.byType(ComposerHint),
              matching: find.byType(RichText),
            )
            .first,
      );
      final text = paragraph.text.toPlainText();
      double left(String word) => paragraph
          .getBoxesForSelection(
            TextSelection(
              baseOffset: text.indexOf(word),
              extentOffset: text.indexOf(word) + word.length,
            ),
          )
          .first
          .left;
      // The first word sits at the right; the Latin name and the question mark end the line.
      expect(left('ما'), greaterThan(left('تغييره')));
      expect(left('تغييره'), greaterThan(left('Hero')));
      expect(left('Hero'), greaterThan(left('؟')));
    });

    testWidgets('an English hint keeps its word order on an Arabic page', (
      tester,
    ) async {
      await tester.pumpWidget(
        app(
          const ComposerHint(text: 'Ask anything'),
          direction: TextDirection.rtl,
        ),
      );
      await settle(tester, 30);
      expect(
        tester.getTopLeft(find.text('Ask')).dx,
        lessThan(tester.getTopLeft(find.text('anything')).dx),
      );
    });
  });

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
      expect(handled, isTrue);
      expect(
        tester.widget<EditableText>(find.byType(EditableText)).controller.text,
        'Hello\n',
      );
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

    testWidgets('send: quiet while empty, sends when ready, stops while busy', (
      tester,
    ) async {
      final handle = tester.ensureSemantics();
      var sent = 0, stopped = 0;
      await tester.pumpWidget(app(_Chat(onSubmit: () => sent++)));
      await settle(tester);
      expect(
        tester
            .getSemantics(find.bySemanticsLabel('Send'))
            .flagsCollection
            .isEnabled,
        Tristate.isFalse,
      );
      await tester.tap(find.bySemanticsLabel('Send'));
      expect(sent, 0);

      await tester.pumpWidget(
        app(_Chat(onSubmit: () => sent++, initial: 'Hi')),
      );
      await settle(tester);
      await tester.tap(find.bySemanticsLabel('Send'));
      expect(sent, 1);

      await tester.pumpWidget(
        app(_Chat(busy: true, onStop: () => stopped++, initial: 'Hi')),
      );
      await tester.pump(const Duration(milliseconds: 50));
      expect(find.bySemanticsLabel('Send'), findsNothing);
      await tester.tap(find.bySemanticsLabel('Stop'));
      expect(stopped, 1);
      await finish(tester);
      handle.dispose();
    }, variant: TargetPlatformVariant.only(TargetPlatform.macOS));

    testWidgets(
      'inline tools stay visible until the draft wraps or adds a line',
      (tester) async {
        var value = '';
        await tester.pumpWidget(
          app(
            StatefulBuilder(
              builder: (context, update) {
                return ComposerBar(
                  inlineTools: true,
                  hasText: value.isNotEmpty,
                  pinned: value.contains('\n'),
                  field: ComposerField(
                    value: value,
                    label: 'Message',
                    onValueChange: (v) => update(() => value = v),
                  ),
                  tools: const [Text('Model')],
                  send: const SizedBox.square(dimension: 30),
                );
              },
            ),
            width: 320,
          ),
        );
        final field = find.byType(EditableText);
        final initial = capsule(tester).height;
        await tester.enterText(field, 'Hi');
        await settle(tester);
        expect(capsule(tester).height, initial);
        expect(find.text('Model').hitTestable(), findsOneWidget);
        for (final draft in ['wide ' * 12, 'x\ny']) {
          await tester.enterText(field, draft);
          await settle(tester, 30);
          expect(
            tester.getRect(field).bottom,
            lessThan(tester.getRect(find.text('Model')).top),
          );
          await tester.enterText(field, 'x');
          await settle(tester, 30);
          expect(capsule(tester).height, initial);
        }
        await finish(tester);
      },
    );

    testWidgets(
      'calm on one line; focus or text opens the second row on a spring',
      (tester) async {
        await tester.pumpWidget(app(_Chat()));
        await settle(tester, 30);
        expect(toolsShown(tester), isFalse);
        final calm = capsule(tester);
        final field = tester.getRect(find.byType(EditableText));
        final send = tester.getRect(find.bySemanticsLabel('Send'));
        expect((field.center.dy - send.center.dy).abs(), lessThan(4));
        expect(calm.height, 44);

        // Focus opens the second row; the capsule springs to its new height.
        await tester.tap(find.byType(EditableText));
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 60));
        final moving = capsule(tester).height;
        await settle(tester, 30);
        final open = capsule(tester);
        expect(toolsShown(tester), isTrue);
        expect(open.height, greaterThan(calm.height + 30));
        expect(moving, greaterThan(calm.height));
        expect(moving, lessThan(open.height));
        final below = tester.getRect(find.bySemanticsLabel('Send'));
        expect(
          below.top,
          greaterThanOrEqualTo(
            tester.getRect(find.byType(EditableText)).bottom - 1,
          ),
        );
        expect(
          tester.getRect(find.text('Smart')).center.dy,
          closeTo(below.center.dy, 2),
        );

        // With text it stays open without focus.
        await tester.pumpWidget(app(_Chat(initial: 'Hello')));
        await settle(tester, 30);
        expect(toolsShown(tester), isTrue);
        await finish(tester);
      },
      variant: TargetPlatformVariant.only(TargetPlatform.macOS),
    );

    testWidgets(
      'right to left: leading bubble at the right, send at the left',
      (tester) async {
        await tester.pumpWidget(
          app(_Chat(initial: 'Short'), direction: TextDirection.rtl),
        );
        await settle(tester, 30);
        final attach = tester.getRect(find.bySemanticsLabel('Attach'));
        final send = tester.getRect(find.bySemanticsLabel('Send'));
        final model = tester.getRect(find.text('Smart'));
        expect(attach.left, greaterThan(capsule(tester).right));
        expect(send.right, lessThan(model.left));
        expect(model.right, greaterThan(capsule(tester).center.dx));
        await finish(tester);
      },
      variant: TargetPlatformVariant.only(TargetPlatform.macOS),
    );

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
      int max = 3,
    }) => ImagePromptComposer(
      mode: .image,
      prompt: prompt,
      onPrompt: onPrompt ?? (_) {},
      placeholder: 'Describe the image you want',
      maxLength: 2000,
      references: references,
      referenceLimit: ReferenceLimit(max: max, formats: const ['image/png']),
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
      ladder: const SizedBox(width: 40, height: 38),
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

    testWidgets('references: the first is marked Main; × removes by id', (
      tester,
    ) async {
      String? removed;
      final handle = tester.ensureSemantics();
      await tester.pumpWidget(app(composer(onRemove: (id) => removed = id)));
      await settle(tester);
      expect(find.text('Main'), findsOneWidget);
      expect(find.bySemanticsLabel('Main: Bottle'), findsOneWidget);
      expect(find.bySemanticsLabel('Label'), findsOneWidget);
      expect(find.text('2 of 3'), findsOneWidget);
      // Inside the capsule, above the field.
      expect(
        tester.getRect(find.bySemanticsLabel('Main: Bottle')).bottom,
        lessThanOrEqualTo(tester.getRect(find.byType(EditableText)).top),
      );
      expect(
        capsule(tester).contains(
          tester.getRect(find.bySemanticsLabel('Main: Bottle')).center,
        ),
        isTrue,
      );
      await tester.tap(find.bySemanticsLabel('Remove Label'));
      expect(removed, 'b');
      await finish(tester);
      handle.dispose();
    }, variant: TargetPlatformVariant.only(TargetPlatform.macOS));

    testWidgets('no attachments without references or a template', (
      tester,
    ) async {
      final handle = tester.ensureSemantics();
      await tester.pumpWidget(app(composer(references: const [])));
      await settle(tester);
      expect(find.text('Main'), findsNothing);
      expect(find.bySemanticsLabel('Reference images'), findsNothing);
      expect(capsule(tester).height, 44);
      await finish(tester);
      handle.dispose();
    }, variant: TargetPlatformVariant.only(TargetPlatform.macOS));

    testWidgets(
      'image prompt stays compact while editing and grows for wraps and newlines',
      (tester) async {
        var prompt = '';
        var submissions = 0;
        await tester.pumpWidget(
          app(
            StatefulBuilder(
              builder: (context, update) => composer(
                references: const [],
                prompt: prompt,
                onPrompt: (v) => update(() => prompt = v),
                onSubmit: () => submissions++,
              ),
            ),
          ),
        );
        await settle(tester);
        final field = find.byType(EditableText);
        final compact = capsule(tester);
        final restingField = tester.getRect(field);
        final press = await tester.startGesture(restingField.center);
        await settle(tester);
        expect(tester.getRect(field), restingField);
        await press.up();
        await tester.enterText(field, 'A vase');
        await settle(tester);
        expect(capsule(tester).height, compact.height);
        await tester.sendKeyDownEvent(LogicalKeyboardKey.shiftLeft);
        await tester.sendKeyEvent(LogicalKeyboardKey.enter);
        await tester.sendKeyUpEvent(LogicalKeyboardKey.shiftLeft);
        await settle(tester);
        expect(prompt, contains('\n'));
        expect(submissions, 0);
        expect(capsule(tester).height, greaterThan(compact.height));
        await tester.enterText(field, 'wide ' * 50);
        await settle(tester);
        expect(capsule(tester).height, greaterThan(compact.height));
        await tester.enterText(field, 'A vase');
        await settle(tester);
        expect(capsule(tester).height, compact.height);
        await finish(tester);
      },
      variant: TargetPlatformVariant.only(TargetPlatform.macOS),
    );

    testWidgets('many references scroll sideways inside the capsule', (
      tester,
    ) async {
      await tester.pumpWidget(
        app(
          composer(
            max: 8,
            references: [
              for (var i = 0; i < 8; i++)
                ComposerReference(id: '$i', url: '', name: 'Photo $i'),
            ],
          ),
          width: 360,
        ),
      );
      await settle(tester);
      final scroller = tester.widget<SingleChildScrollView>(
        find.descendant(
          of: find.byType(ComposerAttachments),
          matching: find.byType(SingleChildScrollView),
        ),
      );
      final controller = scroller.controller!;
      expect(controller.position.maxScrollExtent, greaterThan(0));
      final strip = tester.getRect(find.byType(ComposerAttachments));
      expect(strip.right, lessThanOrEqualTo(capsule(tester).right));
      await tester.drag(
        find.byType(SingleChildScrollView).first,
        const Offset(-200, 0),
      );
      await settle(tester);
      expect(controller.offset, greaterThan(0));
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

    testWidgets('the settings chip (second row) opens the panel and closes', (
      tester,
    ) async {
      await tester.pumpWidget(app(composer(prompt: 'A vase')));
      await settle(tester, 30);
      await tester.tap(find.bySemanticsLabel(RegExp('^Output settings: 1:1')));
      await settle(tester);
      expect(find.text('Shape options'), findsOneWidget);
      expect(find.text('Output settings'), findsWidgets);
      await tester.tap(find.bySemanticsLabel('Close output settings'));
      await settle(tester);
      expect(find.text('Shape options'), findsNothing);
      await finish(tester);
    }, variant: TargetPlatformVariant.only(TargetPlatform.macOS));

    testWidgets(
      'Enter sends unless sending is disabled; the AI button suggests ideas when empty',
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

    testWidgets('the caption sits quietly under the composer', (tester) async {
      await tester.pumpWidget(app(composer()));
      await settle(tester);
      expect(
        tester.getRect(find.text('About 4 DZD')).top,
        greaterThan(capsule(tester).bottom),
      );
      await finish(tester);
    }, variant: TargetPlatformVariant.only(TargetPlatform.macOS));
  });
}
