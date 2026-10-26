import 'dart:ui' show SemanticsRole;

import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

const _features = [
  (name: 'Text to speech', pro: false),
  (name: 'Two speakers in one take', pro: false),
  (name: 'Voice cloning', pro: true),
  (name: 'Commercial use', pro: true),
];

class InAList extends StatelessWidget {
  const InAList({super.key});

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 360,
    child: Semantics(
      container: true,
      role: SemanticsRole.list,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 10,
        children: [
          for (final feature in _features)
            Semantics(
              role: SemanticsRole.listItem,
              child: Row(
                key: ValueKey(feature.name),
                spacing: 8,
                children: [
                  Text(feature.name),
                  if (feature.pro) const ProBadge(),
                ],
              ),
            ),
        ],
      ),
    ),
  );
}
