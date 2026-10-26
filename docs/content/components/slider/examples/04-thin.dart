import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class Thin extends StatefulWidget {
  const Thin({super.key});

  @override
  State<Thin> createState() => _ThinState();
}

class _ThinState extends State<Thin> {
  double volume = 60;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 560,
    child: Row(
      spacing: 12,
      children: [
        const ExcludeSemantics(
          child: LucideIcon(LucideIcons.volume1, size: 18),
        ),
        Expanded(
          child: Slider(
            label: 'Notification volume',
            trackStyle: .thin,
            value: volume,
            onValueChange: (value) => setState(() => volume = value),
            getValueText: (value) => '${value.round()}%',
          ),
        ),
        const ExcludeSemantics(
          child: LucideIcon(LucideIcons.volume2, size: 18),
        ),
      ],
    ),
  );
}
