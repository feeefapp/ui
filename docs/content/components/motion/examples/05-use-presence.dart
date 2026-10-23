import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

const _customers = ['Sara B.', 'Karim M.', 'Nour H.'];

class UsePresenceHook extends StatefulWidget {
  const UsePresenceHook({super.key});

  @override
  State<UsePresenceHook> createState() => _UsePresenceHookState();
}

class _UsePresenceHookState extends State<UsePresenceHook> {
  String? _selected;
  // While closing, keep showing the customer that was open.
  final _shown = Latch<String?>(null);

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final open = _selected != null;
    final shown = _shown.latch(_selected, open);
    return SizedBox(
      width: 360,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Wrap(
            spacing: 12,
            runSpacing: 12,
            alignment: WrapAlignment.center,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              for (final name in _customers)
                Button(
                  variant: .outlined,
                  controlSize: .small,
                  onClick: () => setState(() => _selected = name),
                  children: [Text(name)],
                ),
              Button(
                variant: .text,
                controlSize: .small,
                disabled: !open,
                onClick: () => setState(() => _selected = null),
                children: const [Text('Close')],
              ),
            ],
          ),
          PresenceBuilder(
            open: open,
            exitMs: 160,
            builder: (context, mounted, state) => !mounted
                ? const SizedBox.shrink()
                : Padding(
                    // The column gap belongs to the notice: none while it is unmounted.
                    padding: const EdgeInsets.only(top: 16),
                    child: PresenceTransition(
                      state: state,
                      enter: const PresenceFrame(
                        duration: Duration(milliseconds: 240),
                        dy: 8,
                        scale: 0.98,
                      ),
                      exit: const PresenceFrame(
                        duration: Duration(milliseconds: 160),
                        dy: 4,
                      ),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          vertical: 12,
                          horizontal: 16,
                        ),
                        decoration: BoxDecoration(
                          color: theme.colors.surface,
                          border: Border.all(color: theme.colors.line),
                          borderRadius: BorderRadius.circular(
                            theme.sizes.radiusPanel,
                          ),
                        ),
                        child: Text('Now calling $shown'),
                      ),
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}
