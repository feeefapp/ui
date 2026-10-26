import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

import 'widgets_test.dart' show host;

void main() {
  testWidgets('the settings panel shrinks to short content', (tester) async {
    await tester.pumpWidget(
      host(
        PromptSettingsPanel(
          onClose: () {},
          children: const [SizedBox(height: 40, child: Text('Aspect ratio'))],
        ),
      ),
    );
    for (var i = 0; i < 6; i++) {
      await tester.pump(const Duration(milliseconds: 50));
    }
    expect(
      tester.getSize(find.byType(PromptSettingsPanel)).height,
      lessThan(200),
    );
  });
}
