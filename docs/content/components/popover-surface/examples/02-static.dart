import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class Static extends StatelessWidget {
  const Static({super.key});

  @override
  Widget build(BuildContext context) => Semantics(
    container: true,
    label: 'Delivery estimate',
    child: const SizedBox(
      width: 300,
      child: PopoverSurface(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          spacing: 4,
          children: [
            Text(
              'Arrives Thursday',
              style: TextStyle(fontWeight: FontWeight.w700),
            ),
            Text('Home delivery to Oran · 650 DZD · Cash on delivery'),
          ],
        ),
      ),
    ),
  );
}
