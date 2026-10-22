import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

final _terms = [
  for (var i = 0; i < 10; i++)
    '${i + 1}. Orders are paid in cash on delivery. The courier collects the amount shown on the parcel and the store receives it with the next remittance.',
];

class ViewportProps extends StatefulWidget {
  const ViewportProps({super.key});

  @override
  State<ViewportProps> createState() => _ViewportPropsState();
}

class _ViewportPropsState extends State<ViewportProps> {
  // The web example's viewportProps.onScroll: listen to the area's scroll controller.
  late final _scroll = ScrollController()..addListener(_onScroll);
  int _progress = 0;

  void _onScroll() {
    final p = _scroll.position;
    final max = p.maxScrollExtent - p.minScrollExtent;
    setState(() => _progress = max > 0 ? (p.pixels / max * 100).round() : 100);
  }

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final radius = BorderRadius.circular(theme.sizes.radiusPanel);
    return Container(
      width: double.infinity,
      height: 380,
      decoration: BoxDecoration(
        color: c.surface,
        border: Border.all(color: c.line),
        borderRadius: radius,
      ),
      child: ClipRRect(
        borderRadius: radius,
        child: ScrollArea(
          label: 'Seller terms',
          contentPadding: 20,
          controller: _scroll,
          bottom: Dock(
            label: 'Terms actions',
            content: Text('$_progress% read'),
            children: [
              Button(
                variant: .filled,
                disabled: _progress < 100,
                onClick: () {},
                children: const [Text('Accept terms')],
              ),
            ],
          ),
          // The kit resets `<p>` margins.
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [for (final term in _terms) Text(term)],
          ),
        ),
      ),
    );
  }
}
