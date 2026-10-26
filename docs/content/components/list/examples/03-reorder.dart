import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class DeliveryRoute extends StatefulWidget {
  const DeliveryRoute({super.key});

  @override
  State<DeliveryRoute> createState() => _DeliveryRouteState();
}

class _DeliveryRouteState extends State<DeliveryRoute> {
  var stops = [
    (id: 'a', name: 'Amina Benali', place: 'Bab Ezzouar'),
    (id: 'b', name: 'Yacine Haddad', place: 'Hydra'),
    (id: 'c', name: 'Sara Meziane', place: 'El Biar'),
    (id: 'd', name: 'Karim Saidi', place: 'Kouba'),
    (id: 'e', name: 'Lina Cherif', place: 'Cheraga'),
  ];

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 560,
    child: ListSection(
      header: const Text('Today’s route'),
      footer: const Text(
        'Drag a grip to change the order, or focus it and use the up and down arrow keys.',
      ),
      onReorder: (from, to) => setState(() {
        final next = [...stops];
        final moved = next.removeAt(from);
        next.insert(to, moved);
        stops = next;
      }),
      children: [
        for (final (i, s) in stops.indexed)
          ListRow(
            key: ValueKey(s.id),
            leading: const LucideIcon(LucideIcons.mapPin),
            title: Text('${i + 1}. ${s.name}'),
            subtitle: Text(s.place),
            reorderLabel: 'Reorder ${s.name}',
          ),
      ],
    ),
  );
}
