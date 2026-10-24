import 'dart:async';

import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

const _stops = [
  LadderStop(
    modelId: 'gemini-flash-lite',
    modelName: 'Gemini Flash Lite',
    label: 'Fast',
    access: .free,
  ),
  LadderStop(
    modelId: 'gemini-pro',
    modelName: 'Gemini Pro',
    label: 'Smart',
    access: .pro,
  ),
  LadderStop(
    modelId: 'claude-opus',
    modelName: 'Claude Opus',
    label: 'Best',
    access: .pro,
  ),
];

class PromptComposerDemo extends StatefulWidget {
  const PromptComposerDemo({super.key});

  @override
  State<PromptComposerDemo> createState() => _PromptComposerDemoState();
}

class _PromptComposerDemoState extends State<PromptComposerDemo> {
  String _prompt = '';
  int _model = 1;
  bool _busy = false;
  String? _sent;
  Timer? _timer;

  void _send() {
    setState(() => _busy = true);
    _timer = Timer(const Duration(milliseconds: 1200), () {
      setState(() {
        _sent = _prompt;
        _prompt = '';
        _busy = false;
      });
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 560,
      child: PromptComposer(
        label: 'Message',
        placeholder: 'Ask about your orders, products or customers',
        value: _prompt,
        onValueChange: (value) => setState(() => _prompt = value),
        onSubmit: _send,
        busy: _busy,
        submitLabel: 'Send message',
        maxLength: 4000,
        leading: IconButton(
          variant: .ghost,
          appearance: .toolbar,
          ariaLabel: 'Attach a file',
          onClick: () {},
          icon: const LucideIcon(LucideIcons.plus),
        ),
        tools: [
          ModelLadder(
            variant: .compact,
            stops: _stops,
            index: _model,
            defaultIndex: 1,
            onChange: (value) => setState(() => _model = value),
          ),
        ],
        footer: _sent == null
            ? null
            : Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: Text(
                  'Sent: $_sent',
                  style: TextStyle(
                    color: ThemeProvider.of(context).colors.muted,
                  ),
                ),
              ),
      ),
    );
  }
}
