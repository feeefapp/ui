import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

import 'scenes.dart';

/// The Flutter side of the parity harness: `?scene=<id>&theme=light|dark&palette=lab|mono&density=…`
/// renders the same stage as parity/src/main.tsx, at the same place, in the same font.
void main() => runApp(const Gallery());

class Gallery extends StatelessWidget {
  const Gallery({super.key});

  @override
  Widget build(BuildContext context) {
    final query = Uri.base.queryParameters;
    final scene =
        scenes[query['scene'] ?? 'buttons'] ??
        () => [const Text('Unknown scene')];
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
                        child: Container(
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
