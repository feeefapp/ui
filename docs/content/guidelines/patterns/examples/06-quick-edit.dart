import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

class QuickEdit extends StatelessWidget {
  const QuickEdit({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final rtl = Directionality.of(context) == TextDirection.rtl;
    // `.pt-edit-card`: up to 460px, 8/16 padding, panel corner; rows divided by a line.
    return Container(
      width: 460,
      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
      decoration: ShapeDecoration(
        color: theme.colors.surface,
        shape: SuperellipseBorder(
          radius: theme.sizes.radiusPanel,
          side: BorderSide(color: theme.colors.line),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 4,
        children: [
          const _PhoneRow(),
          const _AddressRow(),
          _EditRow(
            children: [
              const _Value(
                label: 'Products, prices and delivery',
                value: '3 items · 9 600 DA',
              ),
              // Many fields, long work, or something to come back to: a page of its own.
              Button(
                variant: .text,
                onClick: () {},
                children: [
                  const Text('Edit order'),
                  Transform.flip(
                    flipX: rtl,
                    child: const LucideIcon(LucideIcons.arrowRight),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }
}

String? _phoneError(String phone) =>
    RegExp(r'^0[567]\d{8}$').hasMatch(phone.replaceAll(RegExp(r'\s'), ''))
    ? null
    : 'Enter all 10 digits, starting with 05, 06 or 07.';

/// One field, one value: edit it where it is. Enter saves, Escape puts it back.
class _PhoneRow extends StatefulWidget {
  const _PhoneRow();

  @override
  State<_PhoneRow> createState() => _PhoneRowState();
}

class _PhoneRowState extends State<_PhoneRow> {
  String _phone = '0555 12 34 56';
  String? _draft;
  String? _error;

  void _save() {
    final problem = _phoneError(_draft ?? '');
    setState(() {
      _error = problem;
      if (problem == null) {
        _phone = _draft!;
        _draft = null;
      }
    });
  }

  void _cancel() => setState(() {
    _draft = null;
    _error = null;
  });

  @override
  Widget build(BuildContext context) {
    final draft = _draft;
    if (draft == null) {
      return _EditRow(
        first: true,
        children: [
          _Value(label: 'Phone', value: _phone),
          IconButton(
            variant: .text,
            ariaLabel: 'Edit phone',
            onClick: () => setState(() => _draft = _phone),
            icon: const LucideIcon(LucideIcons.pencil),
          ),
        ],
      );
    }
    // `.pt-inline-form`: the field grows from 180px, the buttons follow it and wrap.
    return _EditRow(
      first: true,
      children: [
        CallbackShortcuts(
          bindings: {const SingleActivator(LogicalKeyboardKey.escape): _cancel},
          child: LayoutBuilder(
            builder: (context, constraints) => Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                SizedBox(
                  width: constraints.maxWidth < 360
                      ? constraints.maxWidth
                      : constraints.maxWidth - 180,
                  child: TextField(
                    hint: 'Phone',
                    keyboardType: TextInputType.phone,
                    autofocus: true,
                    value: draft,
                    error: _error,
                    onValueChange: (value) => setState(() => _draft = value),
                    onSubmitted: (_) => _save(),
                  ),
                ),
                Button(
                  variant: .text,
                  onClick: _cancel,
                  children: const [Text('Cancel')],
                ),
                Button(
                  variant: .filled,
                  onClick: _save,
                  children: const [Text('Save')],
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

typedef _Address = ({String wilaya, String commune, String street});

/// A few related fields that must change together: a dialog with its actions in a dock.
class _AddressRow extends StatefulWidget {
  const _AddressRow();

  @override
  State<_AddressRow> createState() => _AddressRowState();
}

class _AddressRowState extends State<_AddressRow> {
  _Address _address = (
    wilaya: '16 · Alger',
    commune: 'Bab Ezzouar',
    street: 'Cité 2068 Logements, Bt 12',
  );
  late _Address _draft = _address;
  bool _open = false;

  void _close() => setState(() => _open = false);

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      _EditRow(
        children: [
          _Value(
            label: 'Delivery address',
            value:
                '${_address.street}, ${_address.commune}, ${_address.wilaya}',
          ),
          Button(
            variant: .tonal,
            onClick: () => setState(() {
              _draft = _address;
              _open = true;
            }),
            children: const [Text('Change address')],
          ),
        ],
      ),
      Modal(
        open: _open,
        onOpenChange: (open) => open ? setState(() => _open = true) : _close(),
        label: 'Change delivery address',
        title: const Text('Change delivery address'),
        dock: PresentationDock(
          label: 'Address actions',
          children: [
            Row(
              mainAxisSize: MainAxisSize.min,
              spacing: 4,
              children: [
                Button(
                  variant: .text,
                  onClick: _close,
                  children: const [Text('Cancel')],
                ),
                Button(
                  variant: .filled,
                  onClick: () {
                    setState(() => _address = _draft);
                    _close();
                  },
                  children: const [Text('Save address')],
                ),
              ],
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          spacing: 16,
          children: [
            Select(
              hint: 'Wilaya',
              value: _draft.wilaya,
              onValueChange: (wilaya) => setState(
                () => _draft = (
                  wilaya: wilaya,
                  commune: _draft.commune,
                  street: _draft.street,
                ),
              ),
              children: const [
                Option(child: Text('16 · Alger')),
                Option(child: Text('31 · Oran')),
                Option(child: Text('25 · Constantine')),
              ],
            ),
            TextField(
              hint: 'Commune',
              value: _draft.commune,
              onValueChange: (commune) => setState(
                () => _draft = (
                  wilaya: _draft.wilaya,
                  commune: commune,
                  street: _draft.street,
                ),
              ),
            ),
            TextField(
              hint: 'Street and building',
              value: _draft.street,
              onValueChange: (street) => setState(
                () => _draft = (
                  wilaya: _draft.wilaya,
                  commune: _draft.commune,
                  street: street,
                ),
              ),
            ),
          ],
        ),
      ),
    ],
  );
}

/// `.pt-edit-row`: wraps, items centred and pushed to both ends, at least 56px tall; every row
/// after the first has a top line.
class _EditRow extends StatelessWidget {
  const _EditRow({this.first = false, required this.children});

  final bool first;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final line = ThemeProvider.of(context).colors.line;
    return Container(
      constraints: const BoxConstraints(minHeight: 56),
      padding: const EdgeInsets.symmetric(vertical: 6),
      alignment: AlignmentDirectional.centerStart,
      decoration: first
          ? null
          : BoxDecoration(
              border: Border(top: BorderSide(color: line)),
            ),
      child: SizedBox(
        width: double.infinity,
        child: Wrap(
          alignment: WrapAlignment.spaceBetween,
          crossAxisAlignment: WrapCrossAlignment.center,
          spacing: 12,
          runSpacing: 8,
          children: children,
        ),
      ),
    );
  }
}

/// A `<small>` label (13px, muted) over its value.
class _Value extends StatelessWidget {
  const _Value({required this.label, required this.value});

  final String label, value;

  @override
  Widget build(BuildContext context) => Column(
    mainAxisSize: MainAxisSize.min,
    crossAxisAlignment: CrossAxisAlignment.start,
    spacing: 2,
    children: [
      Text(
        label,
        style: TextStyle(
          fontSize: 13,
          color: ThemeProvider.of(context).colors.muted,
        ),
      ),
      Text(value),
    ],
  );
}
