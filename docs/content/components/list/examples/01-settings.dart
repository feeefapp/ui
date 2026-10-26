import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class SettingsList extends StatefulWidget {
  const SettingsList({super.key});

  @override
  State<SettingsList> createState() => _SettingsListState();
}

class _SettingsListState extends State<SettingsList> {
  bool notify = true;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 560,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      // Sections sit 24px apart, like `.lab-list-section` on the web.
      spacing: 24,
      children: [
        ListSection(
          header: const Text('Store'),
          children: [
            ListRow(
              chevron: true,
              leading: const LucideIcon(LucideIcons.store),
              title: const Text('Atlas Store'),
              subtitle: const Text('atlas.feeef.store'),
              onClick: () {},
            ),
            ListRow(
              chevron: true,
              leading: const LucideIcon(LucideIcons.truck),
              title: const Text('Couriers'),
              trailing: const Text('3 active'),
              onClick: () {},
            ),
            ListRow(
              chevron: true,
              leading: const LucideIcon(LucideIcons.creditCard),
              title: const Text('Payments'),
              trailing: const Text('Cash on delivery'),
              onClick: () {},
            ),
          ],
        ),
        ListSection(
          header: const Text('Team'),
          footer: const Text('Agents see only the orders assigned to them.'),
          children: [
            ListRow(
              chevron: true,
              leading: const LucideIcon(LucideIcons.users),
              title: const Text('Members'),
              trailing: const Text('5'),
              onClick: () {},
            ),
            // No onClick: a static row that hosts its own control.
            ListRow(
              leading: const LucideIcon(LucideIcons.bell),
              title: const Text('Order alerts'),
              trailing: SlideSwitch(
                label: 'Order alerts',
                checked: notify,
                onCheckedChange: (value) => setState(() => notify = value),
              ),
            ),
          ],
        ),
      ],
    ),
  );
}
