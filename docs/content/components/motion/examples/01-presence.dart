import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class PresenceExample extends StatefulWidget {
  const PresenceExample({super.key});

  @override
  State<PresenceExample> createState() => _PresenceExampleState();
}

class _PresenceExampleState extends State<PresenceExample> {
  int? _synced;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 360,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Button(
          variant: .tonal,
          onClick: () => setState(() => _synced = _synced == null ? 12 : null),
          children: [Text(_synced == null ? 'Sync orders' : 'Dismiss')],
        ),
        Presence(
          open: _synced != null,
          exitMs: 160,
          render: (state) => _SyncNotice(
            child: Text('$_synced orders synced from your store.'),
          ),
        ),
      ],
    ),
  );
}

/// presence.css: the component only reports open/closed; the motion lives here.
class _SyncNotice extends StatelessWidget {
  const _SyncNotice({required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    // The column's 16px gap belongs to the notice: nothing is mounted (and no gap) while closed.
    return Padding(
      padding: const EdgeInsets.only(top: 16),
      child: Semantics(
        liveRegion: true,
        child: PresenceTransition(
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
            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
            decoration: BoxDecoration(
              color: theme.colors.surface,
              border: Border.all(color: theme.colors.line),
              borderRadius: BorderRadius.circular(theme.sizes.radiusPanel),
            ),
            child: Row(
              spacing: 10,
              children: [
                const ExcludeSemantics(
                  child: LucideIcon(LucideIcons.checkCircle2, size: 18),
                ),
                Expanded(child: child),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
