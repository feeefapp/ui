import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

const _stats = {
  'today': (orders: '38', confirmed: '29', revenue: '113 100'),
  'week': (orders: '241', confirmed: '187', revenue: '729 300'),
  'month': (orders: '1032', confirmed: '801', revenue: '3 123 900'),
};

class SwitchingContent extends StatefulWidget {
  const SwitchingContent({super.key});

  @override
  State<SwitchingContent> createState() => _SwitchingContentState();
}

class _SwitchingContentState extends State<SwitchingContent> {
  String _range = 'today';

  @override
  Widget build(BuildContext context) {
    final stats = _stats[_range]!;
    final theme = ThemeProvider.of(context);
    return SizedBox(
      width: 560,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        spacing: 16,
        children: [
          DecoratedBox(
            decoration: ShapeDecoration(
              color: theme.colors.surfaceSoft,
              shape: SuperellipseBorder(radius: theme.sizes.radiusControl),
            ),
            child: SegmentedControl<String>(
              label: 'Summary period',
              value: _range,
              onChange: (value) => setState(() => _range = value),
              options: const [
                SegmentOption(value: 'today', label: 'Today'),
                SegmentOption(value: 'week', label: 'This week'),
                SegmentOption(value: 'month', label: 'This month'),
              ],
            ),
          ),
          Semantics(
            liveRegion: true,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              spacing: 12,
              children: [
                for (final (term, value) in [
                  ('Orders', stats.orders),
                  ('Confirmed', stats.confirmed),
                  ('Revenue (DZD)', stats.revenue),
                ])
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Opacity(
                          opacity: 0.7,
                          child: Text(
                            term,
                            style: const TextStyle(fontSize: 13),
                          ),
                        ),
                        Text(
                          value,
                          style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
