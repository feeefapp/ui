import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

typedef _Address = ({String wilaya, String commune, String street});

const _saved = (
  wilaya: 'Alger',
  commune: 'Bab Ezzouar',
  street: 'Cité 2068 Logements, Bt 12',
);

class FormDialog extends StatefulWidget {
  const FormDialog({super.key});

  @override
  State<FormDialog> createState() => _FormDialogState();
}

class _FormDialogState extends State<FormDialog> {
  _Address _address = _saved;

  /// showModal completes with what the dock pops: the new address, or null on Cancel.
  Future<void> _edit() async {
    var draft = _address;
    final saved = await showModal<_Address>(
      context,
      builder: (context) => Modal(
        label: 'Edit delivery address',
        title: const Text('Edit delivery address'),
        dock: PresentationDock(
          children: [
            Button(
              variant: .text,
              onClick: () => Navigator.pop(context),
              children: const [Text('Cancel')],
            ),
            Button(
              variant: .filled,
              onClick: () => Navigator.pop(context, draft),
              children: const [Text('Save address')],
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          spacing: 16,
          children: [
            TextField(
              hint: 'Wilaya',
              defaultValue: draft.wilaya,
              onValueChange: (wilaya) => draft = (
                wilaya: wilaya,
                commune: draft.commune,
                street: draft.street,
              ),
            ),
            TextField(
              hint: 'Commune',
              defaultValue: draft.commune,
              onValueChange: (commune) => draft = (
                wilaya: draft.wilaya,
                commune: commune,
                street: draft.street,
              ),
            ),
            TextField(
              hint: 'Street and building',
              defaultValue: draft.street,
              onValueChange: (street) => draft = (
                wilaya: draft.wilaya,
                commune: draft.commune,
                street: street,
              ),
            ),
          ],
        ),
      ),
    );
    if (saved != null && mounted) setState(() => _address = saved);
  }

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 360,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 16,
      children: [
        Button(
          variant: .elevated,
          onClick: _edit,
          children: [
            const LucideIcon(LucideIcons.mapPin),
            Text('${_address.commune}, ${_address.wilaya}'),
          ],
        ),
      ],
    ),
  );
}
