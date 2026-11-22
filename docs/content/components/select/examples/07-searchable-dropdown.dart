import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

const _wilayas = [
  '09 Blida',
  '13 Tlemcen',
  '15 Tizi Ouzou',
  '16 Alger',
  '19 Sétif',
  '23 Annaba',
  '25 Constantine',
  '31 Oran',
];

class SearchableDropdown extends StatefulWidget {
  const SearchableDropdown({super.key});

  @override
  State<SearchableDropdown> createState() => _SearchableDropdownState();
}

class _SearchableDropdownState extends State<SearchableDropdown> {
  final _searchFocus = FocusNode();
  String _selected = '';
  String _query = '';

  @override
  void dispose() {
    _searchFocus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Popover(
    label: 'Choose a wilaya',
    width: 320,
    sideOffset: 8,
    collisionPadding: 12,
    trigger: (context, toggle, open) => Button(
      variant: .outlined,
      onClick: () {
        toggle();
        if (open) return;
        setState(() => _query = '');
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted && _searchFocus.context != null) {
            _searchFocus.requestFocus();
          }
        });
      },
      children: [
        Text(_selected.isEmpty ? 'Choose a wilaya' : 'Wilaya · $_selected'),
        const LucideIcon(LucideIcons.chevronDown),
      ],
    ),
    content: (context, close) {
      final query = _query.trim().toLowerCase();
      final matches = _wilayas.where(
        (name) => name.toLowerCase().contains(query),
      );
      return SizedBox(
        height: 318,
        child: ScrollArea(
          label: 'Wilaya results',
          top: TextField(
            focusNode: _searchFocus,
            hint: 'Search by name or code',
            leadingIcon: const LucideIcon(LucideIcons.search),
            value: _query,
            onValueChange: (value) => setState(() => _query = value),
          ),
          child: matches.isEmpty
              ? Semantics(
                  liveRegion: true,
                  child: const Text('No matching wilayas'),
                )
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    for (final name in matches)
                      Button(
                        key: ValueKey(name),
                        variant: .text,
                        pressed: name == _selected,
                        alignment: AlignmentDirectional.centerStart,
                        onClick: () {
                          setState(() => _selected = name);
                          close();
                        },
                        children: [
                          Text(name),
                          if (name == _selected)
                            const LucideIcon(LucideIcons.check),
                        ],
                      ),
                  ],
                ),
        ),
      );
    },
  );
}
