import 'dart:async';
import 'dart:math' as math;

import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

typedef _Settings = ({
  String name,
  String phone,
  String wilaya,
  double homeFee,
  double deskFee,
  bool freeOver,
  double attempts,
});

const _Settings _saved = (
  name: 'Atlas Store',
  phone: '0555 12 34 56',
  wilaya: '16',
  homeFee: 600,
  deskFee: 400,
  freeOver: false,
  attempts: 3,
);

/// Algerian mobile numbers: 10 digits starting with 05, 06 or 07.
String? _phoneError(String phone) =>
    RegExp(r'^0[567]\d{8}$').hasMatch(phone.replaceAll(RegExp(r'\s'), ''))
    ? null
    : 'Enter all 10 digits, starting with 05, 06 or 07.';

class StoreSettings extends StatefulWidget {
  const StoreSettings({super.key});

  @override
  State<StoreSettings> createState() => _StoreSettingsState();
}

class _StoreSettingsState extends State<StoreSettings> {
  _Settings _savedSettings = _saved;
  _Settings _draft = _saved;
  String? _phoneProblem;
  bool _saving = false;
  final _phoneFocus = FocusNode();
  Timer? _timer;

  bool get _dirty => _draft != _savedSettings;

  @override
  void dispose() {
    _timer?.cancel();
    _phoneFocus.dispose();
    super.dispose();
  }

  void _set(_Settings next) => setState(() => _draft = next);

  void _save() {
    final phone = _phoneError(_draft.phone);
    setState(() => _phoneProblem = phone);
    if (phone != null) {
      // After the error renders, so the field is announced with its message.
      WidgetsBinding.instance.addPostFrameCallback(
        (_) => _phoneFocus.requestFocus(),
      );
      return;
    }
    setState(() => _saving = true);
    _timer = Timer(
      const Duration(milliseconds: 700),
      () => setState(() {
        _savedSettings = _draft;
        _saving = false;
      }),
    );
  }

  @override
  Widget build(BuildContext context) {
    final d = _draft;
    return _Frame(
      child: ScrollArea(
        label: 'Store settings',
        bottom: Dock(
          label: 'Settings actions',
          swapKey: _dirty ? 'dirty' : 'clean',
          content: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: Text(_dirty ? 'Unsaved' : 'Saved', softWrap: false),
          ),
          children: [
            Row(
              mainAxisSize: MainAxisSize.min,
              spacing: 4,
              children: [
                if (_dirty)
                  Button(
                    variant: .text,
                    onClick: () => setState(() {
                      _draft = _savedSettings;
                      _phoneProblem = null;
                    }),
                    children: const [Text('Discard')],
                  ),
                Button(
                  variant: .filled,
                  disabled: !_dirty || _saving,
                  onClick: _save,
                  children: [Text(_saving ? 'Saving…' : 'Save changes')],
                ),
              ],
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          spacing: 16,
          children: [
            _Section(
              title: 'Store',
              description:
                  'Shown to customers on your store and on shipping labels.',
              children: [
                _Fields(
                  children: [
                    TextField(
                      hint: 'Store name',
                      value: d.name,
                      required: true,
                      onValueChange: (value) => _set((
                        name: value,
                        phone: d.phone,
                        wilaya: d.wilaya,
                        homeFee: d.homeFee,
                        deskFee: d.deskFee,
                        freeOver: d.freeOver,
                        attempts: d.attempts,
                      )),
                    ),
                    Focus(
                      skipTraversal: true,
                      canRequestFocus: false,
                      onFocusChange: (focused) {
                        if (!focused) {
                          setState(
                            () => _phoneProblem = _phoneError(_draft.phone),
                          );
                        }
                      },
                      child: TextField(
                        hint: 'Support phone',
                        keyboardType: TextInputType.phone,
                        focusNode: _phoneFocus,
                        value: d.phone,
                        error: _phoneProblem,
                        onValueChange: (value) {
                          _set((
                            name: d.name,
                            phone: value,
                            wilaya: d.wilaya,
                            homeFee: d.homeFee,
                            deskFee: d.deskFee,
                            freeOver: d.freeOver,
                            attempts: d.attempts,
                          ));
                          if (_phoneProblem != null) {
                            setState(() => _phoneProblem = _phoneError(value));
                          }
                        },
                      ),
                    ),
                    Select(
                      hint: 'Ship from',
                      value: d.wilaya,
                      onValueChange: (value) => _set((
                        name: d.name,
                        phone: d.phone,
                        wilaya: value,
                        homeFee: d.homeFee,
                        deskFee: d.deskFee,
                        freeOver: d.freeOver,
                        attempts: d.attempts,
                      )),
                      children: const [
                        Option(value: '16', child: Text('16 · Alger')),
                        Option(value: '31', child: Text('31 · Oran')),
                        Option(value: '25', child: Text('25 · Constantine')),
                        Option(value: '09', child: Text('09 · Blida')),
                      ],
                    ),
                  ],
                ),
              ],
            ),
            _Section(
              title: 'Delivery',
              description: 'What customers pay at checkout. Couriers bill you separately.',
              children: [
                _Fields(
                  children: [
                    NumberField(
                      label: 'Home delivery',
                      unit: 'DA',
                      step: 50,
                      min: 0,
                      max: 2000,
                      value: d.homeFee,
                      onValueChange: (value) => _set((
                        name: d.name,
                        phone: d.phone,
                        wilaya: d.wilaya,
                        homeFee: value,
                        deskFee: d.deskFee,
                        freeOver: d.freeOver,
                        attempts: d.attempts,
                      )),
                    ),
                    NumberField(
                      label: 'Stop desk',
                      unit: 'DA',
                      step: 50,
                      min: 0,
                      max: 2000,
                      value: d.deskFee,
                      onValueChange: (value) => _set((
                        name: d.name,
                        phone: d.phone,
                        wilaya: d.wilaya,
                        homeFee: d.homeFee,
                        deskFee: value,
                        freeOver: d.freeOver,
                        attempts: d.attempts,
                      )),
                    ),
                  ],
                ),
                Checkbox(
                  label: const Text('Free delivery over 10 000 DA'),
                  description: const Text(
                    'Orders above this total ship free to every wilaya.',
                  ),
                  checked: d.freeOver,
                  onCheckedChange: (on) => _set((
                    name: d.name,
                    phone: d.phone,
                    wilaya: d.wilaya,
                    homeFee: d.homeFee,
                    deskFee: d.deskFee,
                    freeOver: on,
                    attempts: d.attempts,
                  )),
                ),
              ],
            ),
            _Section(
              title: 'Confirmation calls',
              children: [
                _Fields(
                  children: [
                    NumberField(
                      label: 'Call attempts before failing',
                      min: 1,
                      max: 6,
                      value: d.attempts,
                      onValueChange: (value) => _set((
                        name: d.name,
                        phone: d.phone,
                        wilaya: d.wilaya,
                        homeFee: d.homeFee,
                        deskFee: d.deskFee,
                        freeOver: d.freeOver,
                        attempts: value,
                      )),
                    ),
                  ],
                ),
              ],
            ),
            const _FeatureSwitches(),
          ],
        ),
      ),
    );
  }
}

const _features = [
  (
    id: 'queue',
    label: 'Queue new orders for a call',
    description: 'New orders go straight to your agents’ call queue.',
  ),
  (
    id: 'reviews',
    label: 'Product reviews',
    description: 'Ask delivered customers to rate what they bought.',
  ),
];

/// Switches apply on their own, right away: they never wait for the Save button.
class _FeatureSwitches extends StatefulWidget {
  const _FeatureSwitches();

  @override
  State<_FeatureSwitches> createState() => _FeatureSwitchesState();
}

class _FeatureSwitchesState extends State<_FeatureSwitches> {
  final _on = {'queue': true, 'reviews': false};
  String? _busy;
  Timer? _timer;

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final muted = ThemeProvider.of(context).colors.muted;
    return _Section(
      title: 'Features',
      description: 'These apply as soon as you switch them.',
      children: [
        for (final feature in _features)
          Row(
            spacing: 16,
            children: [
              Expanded(
                child: ExcludeSemantics(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    spacing: 2,
                    children: [
                      Text(
                        feature.label,
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                      Text(
                        feature.description,
                        style: TextStyle(fontSize: 13, color: muted),
                      ),
                    ],
                  ),
                ),
              ),
              SlideSwitch(
                label: feature.label,
                checked: _on[feature.id],
                loading: _busy == feature.id,
                onCheckedCommit: (checked) {
                  _timer?.cancel();
                  setState(() {
                    _on[feature.id] = checked;
                    _busy = feature.id;
                  });
                  _timer = Timer(
                    const Duration(milliseconds: 600),
                    () => setState(() => _busy = null),
                  );
                },
              ),
            ],
          ),
      ],
    );
  }
}

/// `.pt-section`: a bordered surface, 16px padding, 14px gaps, 15px heading and a muted 13px
/// description pulled 8px up under it.
class _Section extends StatelessWidget {
  const _Section({
    required this.title,
    this.description,
    required this.children,
  });

  final String title;
  final String? description;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    return Semantics(
      container: true,
      label: title,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: ShapeDecoration(
          color: theme.colors.surface,
          shape: SuperellipseBorder(
            radius: theme.sizes.radiusSmall,
            side: BorderSide(color: theme.colors.line),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Semantics(
              header: true,
              child: Text(
                title,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w500,
                  letterSpacing: 15 * -0.035,
                  height: 1.12,
                  leadingDistribution: TextLeadingDistribution.even,
                ),
              ),
            ),
            if (description != null) ...[
              const SizedBox(height: 14 - 8),
              Text(
                description!,
                style: TextStyle(fontSize: 13, color: theme.colors.muted),
              ),
            ],
            for (final child in children) ...[
              const SizedBox(height: 14),
              child,
            ],
          ],
        ),
      ),
    );
  }
}

/// `.pt-fields`: `repeat(auto-fit, minmax(200px, 1fr))` with 12px gaps; empty tracks collapse,
/// so fewer fields than columns share the whole row.
class _Fields extends StatelessWidget {
  const _Fields({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) {
      const gap = 12.0;
      final width = constraints.maxWidth;
      final columns = math.min(
        children.length,
        math.max(1, ((width + gap) / (200 + gap)).floor()),
      );
      final cell = (width - gap * (columns - 1)) / columns;
      return Wrap(
        spacing: gap,
        runSpacing: gap,
        children: [
          for (final child in children) SizedBox(width: cell, child: child),
        ],
      );
    },
  );
}

/// `.pt-frame`: a bounded 460px, 14px surface with a superellipse panel corner.
class _Frame extends StatelessWidget {
  const _Frame({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    return Container(
      width: double.infinity,
      height: 460,
      clipBehavior: Clip.antiAlias,
      decoration: ShapeDecoration(
        color: theme.colors.surface,
        shape: SuperellipseBorder(
          radius: theme.sizes.radiusPanel,
          side: BorderSide(color: theme.colors.line),
        ),
      ),
      child: DefaultTextStyle.merge(
        style: const TextStyle(fontSize: 14),
        child: child,
      ),
    );
  }
}
