import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class Loader extends StatefulWidget {
  const Loader({super.key});

  @override
  State<Loader> createState() => _LoaderState();
}

class _LoaderState extends State<Loader> {
  bool _exporting = true;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 360,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 16,
      children: [
        const Wrap(
          spacing: 12,
          runSpacing: 12,
          alignment: WrapAlignment.center,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            PixelLoader(label: 'Loading orders'),
            PixelLoader(size: 32, label: 'Generating audio'),
          ],
        ),
        Semantics(
          liveRegion: true,
          child: Wrap(
            spacing: 12,
            runSpacing: 12,
            alignment: WrapAlignment.center,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: _exporting
                ? const [
                    PixelLoader(size: 16, decorative: true),
                    Text('Exporting 248 orders…'),
                  ]
                : const [Text('Export ready.')],
          ),
        ),
        Button(
          variant: .outlined,
          controlSize: .small,
          onClick: () => setState(() => _exporting = !_exporting),
          children: [Text(_exporting ? 'Finish export' : 'Start again')],
        ),
      ],
    ),
  );
}
