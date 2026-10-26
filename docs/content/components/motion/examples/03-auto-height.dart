import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

const _lines = [
  ('Subtotal', '4,800 DZD'),
  ('Delivery to Oran', '600 DZD'),
  ('Discount', '−300 DZD'),
];

class AutoHeightExample extends StatefulWidget {
  const AutoHeightExample({super.key});

  @override
  State<AutoHeightExample> createState() => _AutoHeightExampleState();
}

class _AutoHeightExampleState extends State<AutoHeightExample> {
  bool _open = false;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    const strong = TextStyle(fontWeight: FontWeight.w700);
    return SizedBox(
      width: 360,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 16,
        children: [
          // A Container insets its child by the border, like CSS.
          Container(
            decoration: BoxDecoration(
              border: Border.all(color: theme.colors.line),
              borderRadius: BorderRadius.circular(theme.sizes.radiusPanel),
            ),
            child: AutoHeight(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  spacing: 8,
                  children: [
                    const Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Total', style: strong),
                        Text('5,100 DZD', style: strong),
                      ],
                    ),
                    if (_open)
                      for (final (label, value) in _lines)
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              label,
                              style: TextStyle(color: theme.colors.muted),
                            ),
                            Text(
                              value,
                              style: TextStyle(color: theme.colors.muted),
                            ),
                          ],
                        ),
                  ],
                ),
              ),
            ),
          ),
          Semantics(
            expanded: _open,
            child: Button(
              variant: .text,
              onClick: () => setState(() => _open = !_open),
              children: [Text(_open ? 'Hide breakdown' : 'Show breakdown')],
            ),
          ),
        ],
      ),
    );
  }
}
