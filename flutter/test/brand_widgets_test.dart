import 'package:feeef_ui/brand/animated_logo.dart';
import 'package:feeef_ui/brand/logo.dart';
import 'package:feeef_ui/i18n/i18n.dart';
import 'package:feeef_ui/i18n/language_switcher.dart';
import 'package:feeef_ui/navigation/workspace_header.dart';
import 'package:feeef_ui/pixel_art.dart';
import 'package:feeef_ui/primitives/button.dart';
import 'package:feeef_ui/primitives/fields.dart';
import 'package:feeef_ui/primitives/layout.dart';
import 'package:feeef_ui/primitives/switch.dart';
import 'package:feeef_ui/icons/lucide.dart';
import 'package:feeef_ui/scroll/reveal.dart';
import 'package:feeef_ui/theme.dart';
import 'package:feeef_ui/theme_switch.dart';
import 'package:feeef_ui/workspace/moving_brand.dart';
import 'package:feeef_ui/workspace/scaffold.dart';
import 'package:flutter/semantics.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

Widget app(
  Widget child, {
  String locale = 'en',
  ValueChanged<String>? onLocale,
  bool reduced = false,
  bool theme = true,
}) => WidgetsApp(
  color: const Color(0xFF000000),
  builder: (context, _) => MediaQuery(
    data: MediaQuery.of(context).copyWith(disableAnimations: reduced),
    child: I18nProvider(
      locale: locale,
      onLocaleChange: onLocale,
      child: FocusScope(
        autofocus: true,
        child: theme
            ? ThemeProvider(
                brightness: Brightness.light,
                child: Overlay(
                  initialEntries: [OverlayEntry(builder: (_) => child)],
                ),
              )
            : Overlay(initialEntries: [OverlayEntry(builder: (_) => child)]),
      ),
    ),
  ),
);

Future<void> settle(WidgetTester tester) async {
  for (var i = 0; i < 20; i++) {
    await tester.pump(const Duration(milliseconds: 50));
  }
}

void main() {
  testWidgets('the static logo is decorative and sized', (tester) async {
    final semantics = tester.ensureSemantics();
    await tester.pumpWidget(
      app(const Center(child: FoAnimatedLogo(width: 100, height: 27))),
    );
    expect(tester.getSize(find.byType(FoAnimatedLogo)), const Size(100, 27));
    expect(find.bySemanticsLabel(RegExp('.')), findsNothing);
    semantics.dispose();
  });

  testWidgets('the animated logo plays once and ends', (tester) async {
    var ended = 0;
    await tester.pumpWidget(
      app(Center(child: FoAnimatedLogoPlayer(onEnd: () => ended++))),
    );
    await tester.pump(const Duration(seconds: 1));
    expect(ended, 0);
    await tester.pump(const Duration(seconds: 3));
    await tester.pump(const Duration(seconds: 1));
    expect(ended, 1);
    expect(tester.hasRunningAnimations, isFalse);
  });

  testWidgets('reduced motion shows the finished animated logo at once', (
    tester,
  ) async {
    var ended = 0;
    await tester.pumpWidget(
      app(
        Center(child: FoAnimatedLogoPlayer(onEnd: () => ended++)),
        reduced: true,
      ),
    );
    await tester.pump();
    expect(ended, 1);
    expect(tester.hasRunningAnimations, isFalse);
  });

  testWidgets('pixel artwork is decorative unless titled', (tester) async {
    final semantics = tester.ensureSemantics();
    await tester.pumpWidget(
      app(
        const Column(
          children: [
            PixelArtwork(seed: 'a', size: 40),
            PixelArtwork(variant: PixelVariant.wave, title: 'Amina', size: 64),
          ],
        ),
      ),
    );
    expect(tester.getSize(find.byType(PixelArtwork).first), const Size(40, 40));
    // `wave` is 2:1.
    expect(tester.getSize(find.byType(PixelArtwork).last), const Size(64, 32));
    expect(
      tester.getSemantics(find.bySemanticsLabel('Amina')),
      matchesSemantics(label: 'Amina', isImage: true),
    );
    semantics.dispose();
  });

  testWidgets(
    'animated artwork breathes, and stays still under reduced motion',
    (tester) async {
      await tester.pumpWidget(
        app(const PixelArtwork(animated: true, variant: PixelVariant.orbit)),
      );
      await tester.pump(const Duration(milliseconds: 100));
      expect(tester.hasRunningAnimations, isTrue);
      await tester.pumpWidget(
        app(
          const PixelArtwork(animated: true, variant: PixelVariant.orbit),
          reduced: true,
        ),
      );
      await tester.pump(const Duration(milliseconds: 100));
      expect(tester.hasRunningAnimations, isFalse);
    },
  );

  testWidgets('a pixel texture fills its parent and lets taps through', (
    tester,
  ) async {
    var taps = 0;
    await tester.pumpWidget(
      app(
        Center(
          child: SizedBox(
            width: 200,
            height: 80,
            child: GestureDetector(
              onTap: () => taps++,
              child: const Stack(
                children: [
                  Positioned.fill(child: ColoredBox(color: Color(0xFFFFFFFF))),
                  Positioned.fill(child: PixelTexture(seed: 'x')),
                ],
              ),
            ),
          ),
        ),
      ),
    );
    expect(tester.getSize(find.byType(PixelTexture)), const Size(200, 80));
    await tester.tap(find.byType(PixelTexture), warnIfMissed: false);
    expect(taps, 1);
  });

  testWidgets('Switch is a compact SlideSwitch', (tester) async {
    var value = false;
    await tester.pumpWidget(
      app(
        StatefulBuilder(
          builder: (context, setState) => Center(
            child: Switch(
              label: 'SMS',
              checked: value,
              onCheckedChange: (v) => setState(() => value = v),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.byType(Switch));
    await settle(tester);
    expect(value, isTrue);
  });

  testWidgets('Link is a focusable link activated by Enter', (tester) async {
    final semantics = tester.ensureSemantics();
    var clicks = 0;
    final focus = FocusNode();
    addTearDown(focus.dispose);
    await tester.pumpWidget(
      app(
        Center(
          child: Link(
            href: '/voice',
            ariaLabel: 'Feeef Lab',
            focusNode: focus,
            onClick: () => clicks++,
            child: const Text('logo'),
          ),
        ),
      ),
    );
    expect(
      tester.getSemantics(find.bySemanticsLabel('Feeef Lab')),
      isSemantics(label: 'Feeef Lab', isLink: true, hasTapAction: true),
    );
    focus.requestFocus();
    await tester.pump();
    await tester.sendKeyEvent(LogicalKeyboardKey.enter);
    expect(clicks, 1);
    await tester.tap(find.text('logo'));
    expect(clicks, 2);
    semantics.dispose();
  });

  testWidgets('Input types, shows a placeholder and disables', (tester) async {
    final semantics = tester.ensureSemantics();
    final typed = <String>[];
    await tester.pumpWidget(
      app(
        Center(
          child: SizedBox(
            width: 240,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Label(child: Text('Phone')),
                Input(
                  ariaLabel: 'Phone',
                  placeholder: '0550 00 00 00',
                  onChanged: typed.add,
                ),
                const Input(ariaLabel: 'Locked', disabled: true),
                const Textarea(ariaLabel: 'Note'),
              ],
            ),
          ),
        ),
      ),
    );
    expect(find.text('0550 00 00 00'), findsOneWidget);
    expect(tester.getSize(find.byType(Input).first).height, 44);
    await tester.tap(find.byType(Input).first);
    await tester.enterText(find.byType(EditableText).first, '0661');
    await tester.pump();
    expect(typed.last, '0661');
    expect(find.text('0550 00 00 00'), findsNothing);
    expect(
      tester.getSemantics(find.bySemanticsLabel('Locked')),
      isSemantics(isTextField: true, isEnabled: false),
    );
    expect(
      tester.getSemantics(find.bySemanticsLabel('Note')),
      isSemantics(isTextField: true, isMultiline: true),
    );
    semantics.dispose();
  });

  testWidgets('ThemeSwitch cycles system → light → dark → system', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    final modes = <ThemeMode>[];
    await tester.pumpWidget(
      app(
        ThemeModeProvider(
          onModeChange: modes.add,
          child: const Center(child: ThemeSwitch()),
        ),
        theme: false,
      ),
    );
    expect(
      find.bySemanticsLabel('Theme: system. Switch to light mode'),
      findsOneWidget,
    );
    for (var i = 0; i < 3; i++) {
      await tester.tap(find.byType(ThemeSwitch));
      await settle(tester);
    }
    expect(modes, [ThemeMode.light, ThemeMode.dark, ThemeMode.system]);
    await tester.tap(find.byType(ThemeSwitch));
    await settle(tester);
    expect(
      find.bySemanticsLabel('Theme: light. Switch to dark mode'),
      findsOneWidget,
    );
    final ctx = tester.element(find.byType(ThemeSwitch));
    expect(ThemeProvider.of(ctx).brightness, Brightness.light);
    semantics.dispose();
  });

  testWidgets('LanguageSwitcher menu sets the locale', (tester) async {
    final chosen = <String>[];
    await tester.pumpWidget(
      app(
        const Center(child: LanguageSwitcher(iconOnly: true)),
        onLocale: chosen.add,
      ),
    );
    await tester.tap(find.byType(IconButton));
    await settle(tester);
    expect(find.text('العربية'), findsOneWidget);
    expect(find.text('Français'), findsOneWidget);
    await tester.tap(find.text('Français'));
    await settle(tester);
    expect(chosen, ['fr']);
    expect(find.text('Français'), findsNothing);
  });

  testWidgets('LanguageSwitcher menu works from the keyboard', (tester) async {
    final chosen = <String>[];
    await tester.pumpWidget(
      app(
        const Center(child: LanguageSwitcher(iconOnly: true)),
        onLocale: chosen.add,
      ),
    );
    await tester.tap(find.byType(IconButton));
    await settle(tester);
    // English is highlighted; up goes to Français.
    await tester.sendKeyEvent(LogicalKeyboardKey.arrowUp);
    await tester.sendKeyEvent(LogicalKeyboardKey.enter);
    await settle(tester);
    expect(chosen, ['fr']);
  });

  group('WorkspaceHeader', () {
    Widget header({List<Widget>? actions}) => WorkspaceHeader(
      toggle: const IconButton(
        variant: ButtonVariant.text,
        ariaLabel: 'Menu',
        icon: LucideMenu(),
      ),
      title: 'Voice',
      detail: 'Untitled project',
      brandLabel: 'Feeef Lab',
      brandHref: '/voice',
      brandSuffix: 'lab',
      embedded: true,
      actions: actions,
    );

    testWidgets('groups, labels and the brand link', (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = (const Size(1200, 400));
      addTearDown(tester.view.reset);
      final semantics = tester.ensureSemantics();
      await tester.pumpWidget(
        app(
          Align(
            alignment: Alignment.topCenter,
            child: header(
              actions: [
                Button(
                  variant: ButtonVariant.filled,
                  appearance: ButtonAppearance.toolbar,
                  onClick: () {},
                  children: const [Text('Share')],
                ),
              ],
            ),
          ),
        ),
      );
      await settle(tester);
      expect(find.bySemanticsLabel('Workspace navigation'), findsOneWidget);
      expect(find.bySemanticsLabel('Workspace actions'), findsOneWidget);
      expect(find.bySemanticsLabel('Feeef Lab'), findsOneWidget);
      expect(find.text('Voice'), findsOneWidget);
      expect(find.text('Untitled project'), findsOneWidget);
      expect(find.text('/ lab'), findsOneWidget);
      // Embedded: at least 54px tall.
      expect(tester.getSize(find.byType(WorkspaceHeader)).height, 54);
      expect(tester.getSize(find.byType(FoAnimatedLogo)), const Size(100, 27));
      semantics.dispose();
    });

    testWidgets('narrow screens hide the context and shrink the logo', (
      tester,
    ) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = (const Size(560, 400));
      addTearDown(tester.view.reset);
      await tester.pumpWidget(
        app(Align(alignment: Alignment.topCenter, child: header())),
      );
      await settle(tester);
      expect(find.text('Voice'), findsNothing);
      expect(tester.getSize(find.byType(FoAnimatedLogo)), const Size(88, 24));
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = (const Size(320, 400));
      await tester.pump();
      expect(find.text('/ lab'), findsNothing);
      expect(tester.getSize(find.byType(FoAnimatedLogo)), const Size(60, 18));
    });

    testWidgets('right to left puts the brand on the right', (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = (const Size(1200, 400));
      addTearDown(tester.view.reset);
      await tester.pumpWidget(
        app(
          Align(alignment: Alignment.topCenter, child: header()),
          locale: 'ar',
        ),
      );
      await settle(tester);
      final logo = tester.getCenter(find.byType(FoAnimatedLogo)).dx;
      final title = tester.getCenter(find.text('Voice')).dx;
      expect(logo, greaterThan(title));
      expect(logo, greaterThan(600));
    });
  });

  group('MovingBrand', () {
    Widget workspace(GlobalKey host, {bool? compact}) => KeyedSubtree(
      key: host,
      child: Scaffold(
        compact: compact,
        side: const ScaffoldSide(
          leading: MovingBrandAnchor(
            slot: BrandAnchorSlot.side,
            child: SizedBox(
              key: ValueKey('side'),
              width: 120,
              height: 40,
              child: FoAnimatedLogo(width: 104, height: 26),
            ),
          ),
          child: Text('Nav'),
        ),
        appBar: const ScaffoldAppBar(
          leading: ScaffoldToggleButton(),
          child: MovingBrandAnchor(
            slot: BrandAnchorSlot.header,
            child: SizedBox(
              key: ValueKey('header'),
              width: 120,
              height: 40,
              child: FoAnimatedLogo(width: 104, height: 26),
            ),
          ),
        ),
        child: MovingBrand(host: host),
      ),
    );

    // The moving visual: the logo that is not inside an anchor.
    Rect moving(WidgetTester tester) => tester.getRect(
      find.byElementPredicate(
        (e) =>
            e.widget is FoAnimatedLogo &&
            e.findAncestorWidgetOfExactType<MovingBrandAnchor>() == null,
      ),
    );

    testWidgets('follows the side logo, then glides to the header', (
      tester,
    ) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = (const Size(1200, 800));
      addTearDown(tester.view.reset);
      final host = GlobalKey();
      await tester.pumpWidget(app(workspace(host)));
      await settle(tester);
      final side = tester.getCenter(find.byKey(const ValueKey('side')));
      expect(moving(tester).center.dx, closeTo(side.dx, 0.2));
      expect(moving(tester).center.dy, closeTo(side.dy, 0.2));
      // Anchors' own logos are hidden while it follows.
      final hidden = tester.widget<Visibility>(
        find
            .ancestor(
              of: find.byKey(const ValueKey('side')),
              matching: find.byType(Visibility),
            )
            .first,
      );
      expect(hidden.visible, isFalse);
      // Collapse the sidebar: the visual glides to the header logo.
      await tester.tap(find.byType(ScaffoldToggleButton));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 16));
      await tester.pump(const Duration(milliseconds: 16));
      final header = tester.getCenter(find.byKey(const ValueKey('header')));
      final mid = moving(tester).center;
      expect((mid - header).distance, greaterThan(1));
      await settle(tester);
      final end = moving(tester).center;
      final headerNow = tester.getCenter(find.byKey(const ValueKey('header')));
      expect((end - headerNow).distance, lessThan(0.2));
    });

    testWidgets('reduced motion jumps', (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = (const Size(1200, 800));
      addTearDown(tester.view.reset);
      final host = GlobalKey();
      await tester.pumpWidget(app(workspace(host), reduced: true));
      await settle(tester);
      await tester.tap(find.byType(ScaffoldToggleButton));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 16));
      await tester.pump(const Duration(milliseconds: 16));
      final header = tester.getCenter(find.byKey(const ValueKey('header')));
      expect((moving(tester).center - header).distance, lessThan(0.2));
    });

    test('blend is an exponential follow', () {
      expect(movingBrandBlend(27.5), closeTo(0.3934693402873666, 1e-12));
      expect(movingBrandBlend(1000), movingBrandBlend(40));
      expect(movingBrandBlend(10, reduced: true), 1);
    });
  });

  group('revealScrollChild', () {
    testWidgets('scrolls the least distance, honouring the reservation', (
      tester,
    ) async {
      final controller = ScrollController();
      addTearDown(controller.dispose);
      final keys = List.generate(20, (i) => GlobalKey());
      await tester.pumpWidget(
        app(
          Align(
            alignment: Alignment.topLeft,
            child: SizedBox(
              width: 200,
              height: 300,
              child: SingleChildScrollView(
                controller: controller,
                child: ScrollRevealPadding(
                  padding: const EdgeInsets.only(bottom: 60),
                  child: Column(
                    children: [
                      for (final key in keys) SizedBox(key: key, height: 50),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      );
      // Row 5 spans 250–300; the visible band ends at 240.
      await revealScrollChild(controller, keys[5].currentContext);
      expect(controller.offset, 60);
      // Already visible: nothing moves.
      await revealScrollChild(controller, keys[3].currentContext);
      expect(controller.offset, 60);
      // Above: aligns its top.
      await revealScrollChild(controller, keys[0].currentContext);
      expect(controller.offset, 0);
      // Centre.
      await revealScrollChild(
        controller,
        keys[10].currentContext,
        block: RevealAlignment.center,
      );
      // Centre of the band is 120; row 10 centres at 525.
      expect(controller.offset, 405);
      // Smooth glides, and finishes at the same place.
      final done = revealScrollChild(
        controller,
        keys[0].currentContext,
        behavior: RevealBehavior.smooth,
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));
      expect(controller.offset, inExclusiveRange(0, 405));
      await tester.pumpAndSettle();
      await done;
      expect(controller.offset, 0);
    });

    test('revealDelta mirrors scrollRevealDelta', () {
      const viewport = Rect.fromLTWH(0, 0, 100, 100);
      expect(
        revealDelta(
          viewport: viewport,
          child: const Rect.fromLTWH(0, 90, 10, 30),
          axis: Axis.vertical,
          padding: const EdgeInsets.only(bottom: 20),
        ),
        40,
      );
      expect(
        revealDelta(
          viewport: viewport,
          child: const Rect.fromLTWH(0, 90, 10, 30),
          axis: Axis.vertical,
          alignment: RevealAlignment.none,
        ),
        0,
      );
      expect(
        revealDelta(
          viewport: viewport,
          child: const Rect.fromLTWH(-30, 0, 10, 10),
          axis: Axis.horizontal,
        ),
        -30,
      );
    });
  });

  testWidgets('Box gives landmarks their roles', (tester) async {
    final semantics = tester.ensureSemantics();
    await tester.pumpWidget(
      app(
        const Column(
          children: [
            Box(as: BoxElement.nav, label: 'Main menu', child: Text('a')),
            Box(child: Text('plain')),
            Divider(),
          ],
        ),
      ),
    );
    final node = tester.getSemantics(find.bySemanticsLabel('Main menu'));
    expect(node.getSemanticsData().role, SemanticsRole.navigation);
    semantics.dispose();
  });
}
