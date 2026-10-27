import 'package:flutter/widgets.dart';

/// No platform views take the pointer outside the web.
Widget shieldElement() => const SizedBox();

/// Nothing to capture outside the web.
void installPointerCapture() {}
