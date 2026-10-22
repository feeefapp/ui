import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class Values extends StatefulWidget {
  const Values({super.key});

  @override
  State<Values> createState() => _ValuesState();
}

class _ValuesState extends State<Values> {
  String courier = 'yalidine';
  String filter = '';

  @override
  Widget build(BuildContext context) {
    // The browser's `<code>`: monospace at 13/16 of the text size.
    const code = TextStyle(fontFamily: 'monospace', fontSize: 15 * 13 / 16);
    return SizedBox(
      width: 360,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 16,
        children: [
          Select(
            hint: 'Courier',
            value: courier,
            onValueChange: (value) => setState(() => courier = value),
            children: const [
              Option(value: 'yalidine', child: Text('Yalidine')),
              Option(value: 'zrexpress', child: Text('ZR Express')),
              Option(value: 'maystro', child: Text('Maystro Delivery')),
              Option(value: 'ecotrack', child: Text('Ecotrack')),
            ],
          ),
          Select(
            hint: 'Show orders from',
            value: filter,
            onValueChange: (value) => setState(() => filter = value),
            children: const [
              Option(value: '', child: Text('Any courier')),
              Option(value: 'yalidine', child: Text('Yalidine')),
              Option(value: 'zrexpress', child: Text('ZR Express')),
            ],
          ),
          Text.rich(
            TextSpan(
              children: [
                const TextSpan(text: 'Saved courier: '),
                TextSpan(text: courier, style: code),
                const TextSpan(text: ', filter: '),
                TextSpan(text: filter.isEmpty ? '(none)' : filter, style: code),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
