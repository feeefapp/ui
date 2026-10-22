import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class RightToLeft extends StatefulWidget {
  const RightToLeft({super.key});

  @override
  State<RightToLeft> createState() => _RightToLeftState();
}

class _RightToLeftState extends State<RightToLeft> {
  TemporalRange? _period;

  @override
  Widget build(BuildContext context) => Directionality(
    textDirection: TextDirection.rtl,
    child: SizedBox(
      width: 360,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 16,
        children: [
          DateRangeField(
            hint: 'فترة الطلبات',
            locale: 'ar-DZ',
            value: _period,
            onValueChange: (value) => setState(() => _period = value),
            clearable: true,
          ),
        ],
      ),
    ),
  );
}
