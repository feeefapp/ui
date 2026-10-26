import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets(
    'edge wash tolerates overlapping sheet editors and their handoff',
    (tester) async {
      final controller = ScrollController();
      addTearDown(controller.dispose);
      Widget view(bool outgoing) => Directionality(
        textDirection: TextDirection.ltr,
        child: SizedBox(
          width: 400,
          height: 300,
          child: Stack(
            children: [
              if (outgoing)
                SingleChildScrollView(
                  key: const ValueKey('outgoing'),
                  controller: controller,
                  child: const SizedBox(height: 900),
                ),
              SingleChildScrollView(
                key: const ValueKey('incoming'),
                controller: controller,
                child: const SizedBox(height: 1200),
              ),
              Positioned.fill(
                child: ScrollGradientOverlay(
                  controller: controller,
                  color: const Color(0xff23372a),
                ),
              ),
            ],
          ),
        ),
      );
      await tester.pumpWidget(view(true));
      expect(controller.positions.length, 2);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(view(false));
      expect(controller.positions.length, 1);
      controller.jumpTo(120);
      await tester.pump();
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );
}
