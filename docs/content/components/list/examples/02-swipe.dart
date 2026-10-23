import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

const _start = [
  (id: 1048, customer: 'Amina Benali', city: 'Alger'),
  (id: 1047, customer: 'Yacine Haddad', city: 'Oran'),
  (id: 1046, customer: 'Sara Meziane', city: 'Constantine'),
  (id: 1045, customer: 'Karim Saidi', city: 'Blida'),
];

class SwipeInbox extends StatefulWidget {
  const SwipeInbox({super.key});

  @override
  State<SwipeInbox> createState() => _SwipeInboxState();
}

class _SwipeInboxState extends State<SwipeInbox> {
  var orders = [..._start];
  var confirmed = <int>[];
  var log = 'Swipe a row either way.';

  void _remove(int id, String what) => setState(() {
    orders = orders.where((o) => o.id != id).toList();
    log = '#$id $what.';
  });

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 560,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 12,
      children: [
        // A section keeps 24px under it when something follows, like `.lab-list-section`.
        Padding(
          padding: const EdgeInsets.only(bottom: 24),
          child: ListSection(
            header: const Text('To confirm'),
            footer: const Text(
              'Swipe right to confirm, left to archive or delete. A long swipe runs the first action.',
            ),
            children: [
              for (final o in orders)
                ListRow(
                  key: ValueKey(o.id),
                  leading: const LucideIcon(LucideIcons.package),
                  title: Text('#${o.id} · ${o.customer}'),
                  subtitle: Text(o.city),
                  trailing: confirmed.contains(o.id)
                      ? const Text('Confirmed')
                      : null,
                  onClick: () => setState(() => log = 'Opened #${o.id}.'),
                  leadingActions: [
                    RowAction(
                      label: 'Confirm',
                      tone: .primary,
                      icon: const LucideIcon(LucideIcons.check),
                      onAction: () => setState(() {
                        confirmed = [...confirmed, o.id];
                        log = '#${o.id} confirmed.';
                      }),
                    ),
                  ],
                  trailingActions: [
                    RowAction(
                      label: 'Delete',
                      tone: .destructive,
                      icon: const LucideIcon(LucideIcons.trash2),
                      onAction: () => _remove(o.id, 'deleted'),
                    ),
                    RowAction(
                      label: 'Archive',
                      icon: const LucideIcon(LucideIcons.archive),
                      onAction: () => _remove(o.id, 'archived'),
                    ),
                  ],
                ),
            ],
          ),
        ),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          spacing: 12,
          children: [
            Flexible(
              child: Semantics(
                liveRegion: true,
                child: Text(
                  log,
                  style: TextStyle(
                    color: ThemeProvider.of(context).colors.muted,
                  ),
                ),
              ),
            ),
            Button(
              variant: .text,
              controlSize: .small,
              onClick: () => setState(() {
                orders = [..._start];
                confirmed = [];
              }),
              children: const [Text('Reset')],
            ),
          ],
        ),
      ],
    ),
  );
}
