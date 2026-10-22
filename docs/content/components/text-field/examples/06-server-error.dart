import 'dart:async';

import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

const _taken = ['dzshop', 'feeef', 'store'];

class ServerError extends StatefulWidget {
  const ServerError({super.key});

  @override
  State<ServerError> createState() => _ServerErrorState();
}

class _ServerErrorState extends State<ServerError> {
  String slug = 'dzshop';
  String? error;
  bool checking = false;
  Timer? _check;

  @override
  void dispose() {
    _check?.cancel();
    super.dispose();
  }

  void check() {
    setState(() => checking = true);
    _check?.cancel();
    _check = Timer(const Duration(milliseconds: 600), () {
      setState(() {
        checking = false;
        error = _taken.contains(slug)
            ? '$slug.feeef.store is taken. Try another name.'
            : null;
      });
    });
  }

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 360,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 16,
      children: [
        TextField(
          hint: 'Store address',
          value: slug,
          onValueChange: (next) => setState(() {
            slug = next.toLowerCase();
            error = null;
          }),
          trailing: const Text('.feeef.store'),
          error: error,
          supportingText: const Text('Letters, numbers and dashes.'),
        ),
        Button(
          variant: .tonal,
          loading: checking,
          onClick: check,
          children: const [Text('Check availability')],
        ),
      ],
    ),
  );
}
