import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

const _wilayas = [
  'Alger',
  'Annaba',
  'Blida',
  'Constantine',
  'Oran',
  'Sétif',
  'Tizi Ouzou',
  'Tlemcen',
];

class Basic extends StatefulWidget {
  const Basic({super.key});

  @override
  State<Basic> createState() => _BasicState();
}

class _BasicState extends State<Basic> {
  String? wilaya;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 360,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 16,
      children: [
        Select(
          hint: 'Wilaya',
          value: wilaya,
          onValueChange: (value) => setState(() => wilaya = value),
          children: [for (final name in _wilayas) Option(child: Text(name))],
        ),
      ],
    ),
  );
}
