import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart' hide Placeholder;

class Placeholder extends StatefulWidget {
  const Placeholder({super.key});

  @override
  State<Placeholder> createState() => _PlaceholderState();
}

class _PlaceholderState extends State<Placeholder> {
  String? sort;

  @override
  Widget build(BuildContext context) => Wrap(
    spacing: 12,
    runSpacing: 12,
    alignment: WrapAlignment.center,
    crossAxisAlignment: WrapCrossAlignment.center,
    children: [
      // In a row, the field is as wide as its content (CSS sizes the row to fit).
      IntrinsicWidth(
        child: Select(
          ariaLabel: 'Sort orders',
          placeholder: 'Sort by',
          controlSize: .small,
          value: sort,
          onValueChange: (value) => setState(() => sort = value),
          children: const [
            Option(value: 'newest', child: Text('Newest first')),
            Option(value: 'oldest', child: Text('Oldest first')),
            Option(value: 'total', child: Text('Highest total')),
          ],
        ),
      ),
    ],
  );
}
