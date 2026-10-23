import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

import 'docs_examples/registry.dart';
import 'scenes.dart';

/// The Flutter side of the parity harness: `?scene=<id>&theme=light|dark&palette=lab|mono&density=…`
/// renders the same stage as parity/src/main.tsx, at the same place, in the same font.
void main() => runApp(const Gallery());

class Gallery extends StatelessWidget {
  const Gallery({super.key});

  @override
  Widget build(BuildContext context) {
    final query = Uri.base.queryParameters;
    final id = query['scene'] ?? 'buttons';
    // `docs:<section>/<page>/<example>`: a docs example on the docs stage.
    final example = id.startsWith('docs:')
        ? docsExamples[id.substring(5)]
        : null;
    final scene = scenes[id] ?? () => [const Text('Unknown scene')];
    return WidgetsApp(
      color: const Color(0xFFFFFFFF),
      // ?dir=rtl renders the Arabic, right-to-left page, like the React harness.
      builder: (context, _) => I18nProvider(
        locale: query['dir'] == 'rtl' ? 'ar' : 'en',
        child: ThemeProvider(
          brightness: query['theme'] == 'dark'
              ? Brightness.dark
              : Brightness.light,
          config: ThemeConfig(
            palette: Palette.values.byName(query['palette'] ?? 'lab'),
            density: Density.values.byName(query['density'] ?? 'comfortable'),
            // ?glassTint=0…1&glassBlur=true&glassRefraction=false, like the React harness.
            glassTint: double.tryParse(query['glassTint'] ?? '') ?? glassTintDefault,
            glassBlur: query['glassBlur'] == 'true',
            glassRefraction: query['glassRefraction'] != 'false',
          ),
          // An overlay for dialogs and popovers, like the browser's top layer.
          child: Overlay(
            initialEntries: [
              OverlayEntry(
                builder: (context) => Builder(
                  builder: (context) => ColoredBox(
                    // The page is the kit's ground, like `.lab-app` around the web stage.
                    color: ThemeProvider.of(context).colors.ground,
                    child: Align(
                      // Block flow: the stage starts at the inline start (the right in RTL).
                      alignment: AlignmentDirectional.topStart,
                      child: DefaultTextStyle.merge(
                        // The browser's default text: 16px, normal line height.
                        style: const TextStyle(
                          fontFamily: kitFontFamily,
                          fontSize: 16,
                        ),
                        child: example != null
                            ? _DocsStage(child: example())
                            : Container(
                                key: const ValueKey('stage'),
                                width: 720,
                                color: ThemeProvider.of(context).colors.surface,
                                padding: const EdgeInsets.all(24),
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  spacing: 24,
                                  children: scene(),
                                ),
                              ),
                      ),
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
}

/// The docs page's example stage (docs/src/styles/docs.css `.docs-stage`): ground colour, 40/24
/// padding, at least 168px tall, the example centred, in the docs' 15px / 1.6 text.
class _DocsStage extends StatelessWidget {
  const _DocsStage({required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) => Container(
    key: const ValueKey('stage'),
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
