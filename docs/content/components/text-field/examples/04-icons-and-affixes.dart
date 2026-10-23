import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/services.dart' show TextInputAction;
import 'package:flutter/widgets.dart';

class IconsAndAffixes extends StatefulWidget {
  const IconsAndAffixes({super.key});

  @override
  State<IconsAndAffixes> createState() => _IconsAndAffixesState();
}

class _IconsAndAffixesState extends State<IconsAndAffixes> {
  String query = 'Sneakers';

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 360,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 16,
      children: [
        TextField(
          ariaLabel: 'Search products',
          placeholder: 'Search products',
          textInputAction: TextInputAction.search,
          leadingIcon: const LucideIcon(LucideIcons.search),
          value: query,
          onValueChange: (value) => setState(() => query = value),
          trailing: query.isEmpty
              ? null
              : IconButton(
                  variant: .text,
                  controlSize: .small,
                  ariaLabel: 'Clear search',
                  onClick: () => setState(() => query = ''),
                  icon: const LucideIcon(LucideIcons.x),
                ),
        ),
        const TextField(
          hint: 'Phone number',
          keyboardType: TextInputType.phone,
          leadingIcon: LucideIcon(LucideIcons.phone),
          leading: Text('+213'),
        ),
        const TextField(
          hint: 'Delivery price',
          keyboardType: TextInputType.number,
          defaultValue: '600',
          trailing: Text('DZD'),
        ),
      ],
    ),
  );
}
