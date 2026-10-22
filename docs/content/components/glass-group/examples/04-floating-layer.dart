import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class FloatingLayerExample extends StatelessWidget {
  const FloatingLayerExample({super.key});

  // Mount the provider once at the root of your app; it is local here only for the demo.
  @override
  Widget build(BuildContext context) =>
      const ScaffoldProvider(child: _SyncNotice());
}

class _SyncNotice extends StatefulWidget {
  const _SyncNotice();

  @override
  State<_SyncNotice> createState() => _SyncNoticeState();
}

class _SyncNoticeState extends State<_SyncNotice> {
  bool _open = false;

  @override
  Widget build(BuildContext context) {
    final c = ThemeProvider.of(context).colors;
    final reserve = ScaffoldProvider.reserveOf(context, .notice);
    // The layer floats over the window; in the tree it takes no room.
    return Stack(
      children: [
        // `.demo-column` inside a shrink-wrapping provider: as wide as its widest line, at most
        // 360px.
        ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 360),
          child: IntrinsicWidth(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              spacing: 16,
              children: [
                Button(
                  variant: .tonal,
                  onClick: () => setState(() => _open = !_open),
                  children: [Text(_open ? 'Hide notice' : 'Show sync notice')],
                ),
                Semantics(
                  liveRegion: true,
                  child: Text(
                    'Reserved at the bottom of the window: ${reserve.round()}px',
                    style: TextStyle(color: c.muted, fontSize: 13),
                  ),
                ),
              ],
            ),
          ),
        ),
        if (_open)
          FloatingLayer(
            slot: .notice,
            child: Semantics(
              liveRegion: true,
              child: GlassGroup(
                padding: const EdgeInsetsDirectional.fromSTEB(16, 6, 6, 6),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  spacing: 12,
                  children: [
                    const Flexible(
                      child: Text('12 orders synced from Yalidine'),
                    ),
                    Button(
                      variant: .text,
                      controlSize: .compact,
                      onClick: () => setState(() => _open = false),
                      children: const [Text('Dismiss')],
                    ),
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }
}
