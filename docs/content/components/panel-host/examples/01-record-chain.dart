import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

/// One controlled chain; content requests children without managing layout.
class RecordChainExample extends StatefulWidget {
  const RecordChainExample({super.key});

  @override
  State<RecordChainExample> createState() => _RecordChainExampleState();
}

class _RecordChainExampleState extends State<RecordChainExample> {
  List<PanelEntry> _panels = [];

  @override
  Widget build(BuildContext context) => SizedBox(
    height: 640,
    child: PanelHost(
      panels: _panels,
      onPanelsChange: (next) => setState(() => _panels = next),
      root: Panel(
        label: 'Apps',
        title: const Text('Apps'),
        child: Builder(
          builder: (context) => Button(
            variant: ButtonVariant.tonal,
            onClick: () => PanelScope.of(context).push(
              PanelEntry(
                id: 'app:feeef-lite',
                panel: Panel(
                  label: 'Feeef lite',
                  title: const Text('Feeef lite'),
                  child: Builder(
                    builder: (context) => Button(
                      variant: ButtonVariant.tonal,
                      onClick: () => PanelScope.of(context).push(
                        const PanelEntry(
                          id: 'owner:mohamad',
                          panel: Panel(
                            label: 'App owner',
                            title: Text('App owner'),
                            child: Text('Owner details'),
                          ),
                        ),
                      ),
                      children: const [Text('Open owner')],
                    ),
                  ),
                ),
              ),
            ),
            children: const [Text('Open Feeef lite')],
          ),
        ),
      ),
    ),
  );
}
