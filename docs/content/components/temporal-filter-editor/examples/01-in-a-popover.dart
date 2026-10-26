import 'dart:math' as math;

import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

const _config = TemporalConfig(type: TemporalType.dateRange);

String _describe(TemporalValue? value) {
  if (value is! TemporalRange) return 'All time';
  return '${value.from.isEmpty ? '…' : value.from} → '
      '${value.to.isEmpty ? '…' : value.to}';
}

class InAPopover extends StatefulWidget {
  const InAPopover({super.key});

  @override
  State<InAPopover> createState() => _InAPopoverState();
}

class _InAPopoverState extends State<InAPopover> {
  TemporalValue? _applied;
  TemporalValue? _draft;
  String? _error;

  @override
  Widget build(BuildContext context) {
    final screen = MediaQuery.sizeOf(context);
    return Popover(
      label: 'Filter orders by date',
      sideOffset: 8,
      collisionPadding: 12,
      width: math.min(640, screen.width - 24),
      onOpenChange: (open) {
        if (open) {
          setState(() {
            _draft = _applied;
            _error = null;
          });
        }
      },
      trigger: (context, toggle, open) => Button(
        variant: .outlined,
        onClick: toggle,
        children: [
          const LucideIcon(LucideIcons.calendarDays),
          Text('Placed: ${_describe(_applied)}'),
        ],
      ),
      content: (context, close) => StatefulBuilder(
        // The panel lives in the overlay: rebuild it with the draft as it changes.
        builder: (context, setPanel) {
          void update(VoidCallback change) {
            setState(change);
            setPanel(() {});
          }

          return SizedBox(
            height: math.min(520, screen.height * 0.7),
            child: ScrollArea(
              label: 'Date filter',
              contentPadding: 12,
              bottom: Dock(
                label: 'Date filter actions',
                children: [
                  Button(
                    variant: .text,
                    onClick: () => update(() => _draft = null),
                    children: const [Text('Clear')],
                  ),
                  Button(
                    variant: .filled,
                    onClick: () {
                      final failure = validateTemporal(_config, _draft);
                      if (failure != null) {
                        update(() => _error = failure);
                        return;
                      }
                      setState(() => _applied = _draft);
                      close();
                    },
                    children: const [Text('Apply')],
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  TemporalFilterEditor(
                    config: _config,
                    value: _draft,
                    onChange: (next) => update(() => _draft = next),
                  ),
                  if (_error != null)
                    Semantics(liveRegion: true, child: Text(_error!)),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
