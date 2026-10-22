import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class RenderSlots extends StatefulWidget {
  const RenderSlots({super.key});

  @override
  State<RenderSlots> createState() => _RenderSlotsState();
}

class _RenderSlotsState extends State<RenderSlots> {
  double strength = 70;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 560,
    child: Slider(
      label: 'Background removal strength',
      value: strength,
      onValueChange: (value) => setState(() => strength = value),
      getValueText: (value) => '${value.round()}%',
      renderThumb: (state) => Center(
        child: Text(
          '${state.value.round()}',
          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
        ),
      ),
    ),
  );
}
