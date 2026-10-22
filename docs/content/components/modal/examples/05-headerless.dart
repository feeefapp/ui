import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class Headerless extends StatefulWidget {
  const Headerless({super.key});

  @override
  State<Headerless> createState() => _HeaderlessState();
}

class _HeaderlessState extends State<Headerless> {
  bool _open = false;

  void _close() => setState(() => _open = false);

  @override
  Widget build(BuildContext context) => Column(
    mainAxisSize: MainAxisSize.min,
    children: [
      Button(
        variant: .tonal,
        onClick: () => setState(() => _open = true),
        children: const [Text('Publish store')],
      ),
      Modal(
        open: _open,
        close: _close,
        label: 'Your store is live',
        scrollable: true,
        fitContent: true,
        headerless: true,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            spacing: 12,
            children: [
              const ExcludeSemantics(
                child: LucideIcon(LucideIcons.partyPopper, size: 40),
              ),
              Semantics(
                header: true,
                child: const Text(
                  'Your store is live',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w500,
                    letterSpacing: 20 * -0.035,
                    height: 22 / 20,
                  ),
                ),
              ),
              const Text(
                'Customers can now order at dz-sneakers.feeef.store.',
                textAlign: TextAlign.center,
              ),
              Wrap(
                spacing: 12,
                runSpacing: 12,
                alignment: WrapAlignment.center,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  Button(
                    variant: .text,
                    onClick: _close,
                    children: const [Text('Close')],
                  ),
                  Button(
                    variant: .filled,
                    onClick: _close,
                    children: const [Text('Share link')],
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    ],
  );
}
