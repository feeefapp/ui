import 'package:flutter/widgets.dart';

import '../brand/geometry.dart';
import '../icons/lucide.dart';
import '../theme.dart';
import '../theme/color_mix.dart';
import '../theme/css_text.dart';

/// A small lock + "PRO" tag for a feature that needs a paid plan: the twin of `ProBadge` in
/// `@feeef.dev/ui/primitives/badge` (9px medium text, 10px lock, 5px superellipse corners).
class ProBadge extends StatelessWidget {
  const ProBadge({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    return DecoratedBox(
      decoration: ShapeDecoration(
        color: mixSrgb(c.primary, 0.08, c.surface),
        shape: SuperellipseBorder(
          radius: 5 * theme.sizes.radiusScale,
          side: BorderSide(color: mixSrgb(c.primary, 0.22, c.surface)),
        ),
      ),
      child: Padding(
        // 1px 4px padding inside a 1px border.
        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
        child: IconTheme.merge(
          data: IconThemeData(color: c.focus),
          child: DefaultTextStyle.merge(
            style: TextStyle(
              fontSize: 9,
              height: 1.5,
              leadingDistribution: TextLeadingDistribution.even,
              fontWeight: FontWeight.w500,
              letterSpacing: 9 * 0.025,
              color: c.focus,
            ),
            child: const CssBaseline(
              lineHeight: 13.5,
              child: Row(
                mainAxisSize: MainAxisSize.min,
                spacing: 3,
                children: [LucideLockKeyhole(size: 10), Text('PRO')],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
