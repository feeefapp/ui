import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

import 'widgets_test.dart' show host;

void main() {
  testWidgets(
    'changing options after natural-width measurement keeps folding bounds finite',
    (tester) async {
      final options = ValueNotifier<List<SegmentOption<String>>>(const [
        SegmentOption(value: 'all', label: 'All'),
        SegmentOption(value: 'favorites', label: 'Favorites'),
      ]);
      await tester.pumpWidget(
        host(
          SizedBox(
            width: 148,
            child: ValueListenableBuilder(
              valueListenable: options,
              builder: (_, items, _) => SegmentedControl<String>(
                label: 'Categories',
                value: 'all',
                onChange: (_) {},
                options: items,
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      for (var i = 0; i < 3; i++) {
        options.value = [
          ...options.value,
          SegmentOption(value: 'category$i', label: 'Category $i'),
        ];
        for (var frame = 0; frame < 16; frame++) {
          await tester.pump(const Duration(milliseconds: 16));
          expect(tester.takeException(), isNull);
        }
        await tester.pumpAndSettle();
      }
      await tester.pumpWidget(const SizedBox.shrink());
      options.dispose();
    },
  );
}
