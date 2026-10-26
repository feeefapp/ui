import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

import 'examples/registry.dart';

/// The page under test. The integration test switches it; `null` shows an empty ground.
final benchPage = ValueNotifier<String?>(null);

/// The plain-text baseline page: kit theme and text, no glass, no animation.
const baselinePage = 'baseline/text';

/// `bench/flutter.sh --theme quality|balanced|performance` runs under that `ThemeProfiles` config.
const benchTheme = String.fromEnvironment('BENCH_THEME');

void main() => runApp(const BenchApp());

/// Same wrapping as the parity gallery (flutter/example/lib/main.dart) with its defaults, but the
/// page is every docs example of one docs page stacked in a scroll view, like the docs Examples view.
class BenchApp extends StatelessWidget {
  const BenchApp({super.key});

  @override
  Widget build(BuildContext context) => WidgetsApp(
    color: const Color(0xFFFFFFFF),
    builder: (context, _) => I18nProvider(
      locale: 'en',
      child: ThemeProvider(
        brightness: Brightness.light,
        config: switch (benchTheme) {
          'quality' => ThemeProfiles.quality,
          'balanced' => ThemeProfiles.balanced,
          'performance' => ThemeProfiles.performance,
          _ => ThemeConfig(
            palette: Palette.lab,
            density: Density.comfortable,
            glassTint: glassTintDefault,
            glassBlur: false,
            glassRefraction: true,
          ),
        },
        child: Overlay(
          initialEntries: [
            OverlayEntry(
              builder: (context) => ColoredBox(
                color: ThemeProvider.of(context).colors.ground,
                child: DefaultTextStyle.merge(
                  style: const TextStyle(fontFamily: kitFontFamily, fontSize: 16),
                  child: ValueListenableBuilder<String?>(
                    valueListenable: benchPage,
                    builder: (context, page, _) => page == null
                        ? const SizedBox.expand()
                        : _Page(key: ValueKey(page), page: page),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

class _Page extends StatelessWidget {
  const _Page({super.key, required this.page});
  final String page;

  @override
  Widget build(BuildContext context) {
    // `example:<id>` shows one example alone (idle attribution in bench_main.dart).
    final examples = page.startsWith('example:')
        ? [for (final list in benchPages.values) ...list.where((e) => e.$1 == page.substring(8))]
        : benchPages[page] ?? const [];
    final children = page == baselinePage
        ? [
            for (var i = 0; i < 40; i++)
              const Padding(
                padding: EdgeInsets.only(bottom: 16),
                child: Text(
                  'Feeef UI is the kit every Feeef web and Flutter app is built with. This paragraph '
                  'is plain text on the ground, the baseline every other page is compared with.',
                  style: TextStyle(fontSize: 15, height: 1.6),
                ),
              ),
          ]
        : [
            for (final (id, build) in examples)
              Padding(
                padding: const EdgeInsets.only(bottom: 32),
                child: _Stage(key: ValueKey('stage:$id'), child: build()),
              ),
          ];
    // Every example is built up front, like the docs page keeps all of them in the DOM.
    return SingleChildScrollView(
      key: const ValueKey('bench-scroll'),
      padding: const EdgeInsets.symmetric(vertical: 24),
      child: Center(
        child: SizedBox(
          width: 720,
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: children),
        ),
      ),
    );
  }
}

/// The docs example stage (docs.css `.docs-stage`), as in the parity gallery.
class _Stage extends StatelessWidget {
  const _Stage({super.key, required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) => Container(
    width: 720,
    color: ThemeProvider.of(context).colors.ground,
    padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 24),
    constraints: const BoxConstraints(minHeight: 168),
    child: DefaultTextStyle.merge(
      style: const TextStyle(fontSize: 15, height: 1.6),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [child],
      ),
    ),
  );
}
