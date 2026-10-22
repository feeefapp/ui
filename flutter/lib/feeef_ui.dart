/// Feeef UI kit for Flutter: the Dart twin of `@feeef.dev/ui`. Same component names and props,
/// same tokens and geometry (tested against the web kit), built on `widgets.dart` only.
///
/// Import paths mirror the web kit's: `package:feeef_ui/primitives/button.dart` is
/// `@feeef.dev/ui/primitives/button`. Names like `Button` are generic, so apps that also import
/// Material can prefix this library: `import 'package:feeef_ui/feeef_ui.dart' as ui;`.
library;

export 'brand/geometry.dart'
    show SuperellipseBorder, superellipsePath, superellipsePoints;
export 'icons/lucide.dart';
export 'primitives/badge.dart';
export 'primitives/button.dart';
export 'primitives/choice.dart';
export 'primitives/segmented.dart';
export 'primitives/slider.dart';
export 'primitives/slider_core.dart';
export 'primitives/spring_core.dart';
export 'theme.dart';
