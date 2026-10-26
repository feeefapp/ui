import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

const _events = [
  'Order placed',
  'Confirmed by phone',
  'Packed',
  'Handed to Yalidine',
  'Arrived at Oran hub',
  'Out for delivery',
  'Customer not reachable',
  'Second attempt scheduled',
  'Delivered',
  'Cash collected',
  'Remittance received',
];

class GradientOverlay extends StatefulWidget {
  const GradientOverlay({super.key});

  @override
  State<GradientOverlay> createState() => _GradientOverlayState();
}

class _GradientOverlayState extends State<GradientOverlay> {
  final _viewport = ScrollController();

  @override
  void dispose() {
    _viewport.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final radius = BorderRadius.circular(theme.sizes.radiusPanel);
    // The overlay is a sibling of your own scroller, stacked over it.
    return Container(
      width: double.infinity,
      height: 300,
      decoration: BoxDecoration(
        color: c.surface,
        border: Border.all(color: c.line),
        borderRadius: radius,
      ),
      child: ClipRRect(
        borderRadius: radius,
        child: Stack(
          fit: StackFit.expand,
          children: [
            Semantics(
              container: true,
              label: 'Delivery history',
              child: SingleChildScrollView(
                controller: _viewport,
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  spacing: 8,
                  children: [
                    for (final (i, event) in _events.indexed)
                      Container(
                        padding: const EdgeInsets.symmetric(
                          vertical: 12,
                          horizontal: 14,
                        ),
                        decoration: BoxDecoration(
                          color: c.surface,
                          border: Border.all(color: c.line),
                          borderRadius: BorderRadius.circular(
                            theme.sizes.radiusSmall,
                          ),
                        ),
                        child: DefaultTextStyle.merge(
                          style: const TextStyle(fontSize: 13),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            spacing: 2,
                            children: [
                              Text(
                                event,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              Text(
                                'Oct ${i + 3}, 10:${'${i * 5}'.padLeft(2, '0')}',
                                style: TextStyle(
                                  color: c.muted,
                                  fontSize: 13 * 0.833,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
            ScrollGradientOverlay(
              controller: _viewport,
              topHeight: 60,
              bottomHeight: 80,
              color: c.surface,
              radius: theme.sizes.radiusPanel,
            ),
          ],
        ),
      ),
    );
  }
}
