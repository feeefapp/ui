import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class FormValues extends StatefulWidget {
  const FormValues({super.key});

  @override
  State<FormValues> createState() => _FormValuesState();
}

class _FormValuesState extends State<FormValues> {
  String? _shipped = '2026-10-19';
  TemporalRange? _period = const TemporalRange(
    from: '2026-10-01',
    to: '2026-10-31',
  );
  String _submitted = '';

  /// What the web form submits: `name` as the ISO value (a range as JSON), and the `rangeNames`
  /// entries for each end.
  void _export() {
    final period = _period;
    setState(
      () => _submitted = [
        'shipped=${_shipped ?? ''}',
        'period=${period == null ? '' : '{"from":"${period.from}","to":"${period.to}"}'}',
        'placed_from=${period?.from ?? ''}',
        'placed_to=${period?.to ?? ''}',
      ].join('\n'),
    );
  }

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 360,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 16,
      children: [
        DateField(
          hint: 'Shipped on',
          value: _shipped,
          onValueChange: (value) => setState(() => _shipped = value),
        ),
        DateRangeField(
          hint: 'Orders placed',
          value: _period,
          onValueChange: (value) => setState(() => _period = value),
        ),
        Button(
          variant: .tonal,
          onClick: _export,
          children: const [Text('Export orders')],
        ),
        if (_submitted.isNotEmpty)
          Text(
            _submitted,
            style: const TextStyle(fontFamily: 'monospace', fontSize: 13),
          ),
      ],
    ),
  );
}
