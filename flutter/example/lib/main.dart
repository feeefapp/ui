import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

/// Renders the same demos as the web docs, for side-by-side comparison.
void main() => runApp(const Gallery());

class Gallery extends StatefulWidget {
  const Gallery({super.key});
  @override
  State<Gallery> createState() => _GalleryState();
}

class _GalleryState extends State<Gallery> {
  String delivery = 'home';

  @override
  Widget build(BuildContext context) {
    final dark = Uri.base.queryParameters['theme'] == 'dark';
    return WidgetsApp(
      color: const Color(0xFF72CE5D),
      builder: (context, _) => ThemeProvider(
        brightness: dark ? Brightness.dark : Brightness.light,
        child: Builder(
          builder: (context) => ColoredBox(
            color: ThemeProvider.of(context).colors.surface,
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                spacing: 24,
                children: [
                  // Mirrors docs/content/components/button/examples/01-variants.tsx.
                  Wrap(
                    spacing: 12,
                    runSpacing: 12,
                    children: [
                      Button(variant: .filled, onClick: () {}, children: const [Text('Filled')]),
                      Button(variant: .tonal, onClick: () {}, children: const [Text('Tonal')]),
                      Button(variant: .elevated, onClick: () {}, children: const [Text('Elevated')]),
                      Button(variant: .outlined, onClick: () {}, children: const [Text('Outlined')]),
                      Button(variant: .text, onClick: () {}, children: const [Text('Text')]),
                      Button(variant: .ghost, onClick: () {}, children: const [Text('Ghost')]),
                      Button(variant: .destructive, onClick: () {}, children: const [Text('Delete')]),
                    ],
                  ),
                  // Mirrors docs/content/components/segmented-control/examples/01-basic.tsx.
                  SegmentedControl<String>(
                    label: 'Delivery type',
                    value: delivery,
                    onChange: (value) => setState(() => delivery = value),
                    options: const [
                      SegmentOption(value: 'home', label: 'Home delivery'),
                      SegmentOption(value: 'desk', label: 'Stop desk'),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
