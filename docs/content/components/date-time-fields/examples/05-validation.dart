import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

bool _isFriday(String value) =>
    parseCalendarDate(value).weekday == DateTime.friday;

String? _rule(TemporalValue? value) =>
    value is TemporalSingle && _isFriday(value.value)
    ? 'Couriers don’t deliver on Friday. Choose another day.'
    : null;

class Validation extends StatefulWidget {
  const Validation({super.key});

  @override
  State<Validation> createState() => _ValidationState();
}

class _ValidationState extends State<Validation> {
  final _field = FocusNode();
  String? _date;
  String? _error;
  String _status = '';

  @override
  void dispose() {
    _field.dispose();
    super.dispose();
  }

  /// The form's submit: a required, valid date, or the field shows why and takes focus.
  void _submit() {
    final error = _date == null
        ? 'Choose a delivery date.'
        : _rule(TemporalSingle(_date!));
    if (error != null) {
      setState(() => _error = error);
      _field.requestFocus();
      return;
    }
    setState(() {
      _error = null;
      _status = 'Delivery scheduled for $_date.';
    });
  }

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 360,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 16,
      children: [
        DateField(
          hint: 'Delivery date',
          focusNode: _field,
          value: _date,
          onValueChange: (value) => setState(() {
            _date = value;
            _error = null;
          }),
          required: true,
          requiredMessage: 'Choose a delivery date.',
          validator: _rule,
          error: _error,
        ),
        Button(
          variant: .filled,
          onClick: _submit,
          children: const [Text('Schedule delivery')],
        ),
        Semantics(liveRegion: true, child: Text(_status)),
      ],
    ),
  );
}
