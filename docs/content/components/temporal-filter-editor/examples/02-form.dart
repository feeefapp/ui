import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

const _config = TemporalConfig(type: TemporalType.timeRange);

/// `JSON.stringify` of a temporal value.
String _json(TemporalValue? value) => switch (value) {
  TemporalRange(:final from, :final to) => '{"from":"$from","to":"$to"}',
  TemporalSingle(:final value) => '"$value"',
  null => 'null',
};

class InAForm extends StatefulWidget {
  const InAForm({super.key});

  @override
  State<InAForm> createState() => _InAFormState();
}

class _InAFormState extends State<InAForm> {
  TemporalValue? _draft;
  String _status = 'Choose the hours couriers can pick up parcels.';

  void _submit() {
    final value = normalizeTemporal(_draft);
    final error = validateTemporal(_config, value);
    setState(() => _status = error ?? 'Saved pickup hours: ${_json(value)}');
  }

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 560,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 16,
      children: [
        TemporalFilterEditor(
          config: _config,
          value: _draft,
          onChange: (next) => setState(() => _draft = next),
          onSubmit: _submit,
        ),
        Button(
          variant: .filled,
          onClick: _submit,
          children: const [Text('Save pickup hours')],
        ),
        Semantics(liveRegion: true, child: Text(_status)),
      ],
    ),
  );
}
