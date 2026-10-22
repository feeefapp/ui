import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart' hide RadioGroup;
import 'package:flutter_test/flutter_test.dart';

import 'widgets_test.dart' show host;

void main() {
  testWidgets('equalWidth fills the row with equal options that ellipsize', (
    tester,
  ) async {
    await tester.pumpWidget(
      host(
        SizedBox(
          width: 400,
          child: SegmentedControl<String>(
            label: 'Which end',
            value: 'from',
            onChange: (_) {},
            equalWidth: true,
            options: const [
              SegmentOption(value: 'from', label: 'Start · Oct 1'),
              SegmentOption(
                value: 'to',
                label: 'End · a label far too long to fit in half of the row',
              ),
            ],
          ),
        ),
      ),
    );
    final control = tester.getSize(find.byType(SegmentedControl<String>));
    expect(control.width, 400);
    final start = tester.getRect(
      find
          .ancestor(
            of: find.text('Start · Oct 1'),
            matching: find.byType(DecoratedBox),
          )
          .first,
    );
    final end = tester.getRect(
      find
          .ancestor(
            of: find.textContaining('End ·'),
            matching: find.byType(DecoratedBox),
          )
          .first,
    );
    expect(start.width, closeTo(end.width, 0.01));
    expect(tester.takeException(), isNull, reason: 'no overflow');
  });
}
