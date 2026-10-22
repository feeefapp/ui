import 'package:feeef_ui/primitives/raw_input.dart';
import 'package:flutter/widgets.dart';

class RawInputExample extends StatefulWidget {
  const RawInputExample({super.key});

  @override
  State<RawInputExample> createState() => _RawInputExampleState();
}

class _RawInputExampleState extends State<RawInputExample> {
  String title = 'Summer collection 2026';
  String? error;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 560,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        RawInput(
          label: 'Collection title',
          multiline: true,
          maxLines: 3,
          value: title,
          onValueChange: (value) => setState(() => title = value),
          validationMode: .change,
          validator: (value) =>
              value.trim().isNotEmpty ? null : 'Give the collection a title.',
          onValidationChange: (value) => setState(() => error = value),
          style: const TextStyle(
            fontSize: 28,
            fontWeight: FontWeight.w600,
            height: 36 / 28,
          ),
        ),
        Semantics(
          liveRegion: true,
          child: error == null ? const SizedBox.shrink() : Text(error!),
        ),
      ],
    ),
  );
}
