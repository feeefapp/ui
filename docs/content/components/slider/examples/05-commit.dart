import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

/// `toLocaleString('fr-DZ')`: groups of three split by a narrow no-break space.
String _dzd(double value) {
  final digits = value.round().toString();
  final grouped = digits.replaceAllMapped(
    RegExp(r'\B(?=(\d{3})+(?!\d))'),
    (_) => ' ',
  );
  return '$grouped DZD';
}

class Commit extends StatefulWidget {
  const Commit({super.key});

  @override
  State<Commit> createState() => _CommitState();
}

class _CommitState extends State<Commit> {
  double price = 3000;
  double applied = 3000;
  int requests = 0;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 560,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 8,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text('Maximum price'),
            Semantics(liveRegion: true, child: Text(_dzd(price))),
          ],
        ),
        Slider(
          label: 'Maximum price',
          min: 500,
          max: 20000,
          step: 500,
          value: price,
          onValueChange: (value) => setState(() => price = value),
          onValueCommit: (value) => setState(() {
            applied = value;
            requests += 1;
          }),
          getValueText: _dzd,
        ),
        Semantics(
          liveRegion: true,
          child: Text(
            'Showing products up to ${_dzd(applied)} · $requests filter requests',
          ),
        ),
      ],
    ),
  );
}
