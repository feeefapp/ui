import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class SingleValues extends StatefulWidget {
  const SingleValues({super.key});

  @override
  State<SingleValues> createState() => _SingleValuesState();
}

class _SingleValuesState extends State<SingleValues> {
  String? _delivery;
  String? _pickup = '10:30';
  String? _callback;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 360,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 16,
      children: [
        DateField(
          hint: 'Delivery date',
          value: _delivery,
          onValueChange: (value) => setState(() => _delivery = value),
          clearable: true,
        ),
        TimeField(
          hint: 'Courier pickup',
          value: _pickup,
          onValueChange: (value) => setState(() => _pickup = value),
        ),
        DateTimeField(
          hint: 'Call the customer back',
          value: _callback,
          onValueChange: (value) => setState(() => _callback = value),
          supportingText: const Text(
            'The confirmation agent gets a reminder at this time.',
          ),
        ),
      ],
    ),
  );
}
