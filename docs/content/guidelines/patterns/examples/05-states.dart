import 'dart:async';

import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

enum _State { loading, empty, error, ready }

class States extends StatefulWidget {
  const States({super.key});

  @override
  State<States> createState() => _StatesState();
}

class _StatesState extends State<States> {
  _State _state = _State.error;
  Timer? _timer;

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _show(_State next) {
    _timer?.cancel();
    setState(() => _state = next);
  }

  // Retrying shows the loader for a moment, then the orders.
  void _retry() {
    _show(_State.loading);
    _timer = Timer(
      const Duration(milliseconds: 1200),
      () => setState(() => _state = _State.ready),
    );
  }

  @override
  Widget build(BuildContext context) => SizedBox(
    width: double.infinity,
    child: Column(
      spacing: 16,
      children: [
        SegmentedControl<_State>(
          label: 'Preview state',
          value: _state,
          onChange: _show,
          options: const [
            SegmentOption(value: _State.loading, label: 'Loading'),
            SegmentOption(value: _State.empty, label: 'Empty'),
            SegmentOption(value: _State.error, label: 'Error'),
            SegmentOption(value: _State.ready, label: 'Loaded'),
          ],
        ),
        _Frame(
          height: 340,
          child: Semantics(
            liveRegion: true,
            child: switch (_state) {
              _State.loading => const _OrdersLoading(),
              _State.empty => const _OrdersEmpty(),
              _State.error => _OrdersError(onRetry: _retry),
              _State.ready => Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  spacing: 8,
                  children: [
                    for (final row in const [
                      '#1048 · Amina Benali',
                      '#1047 · Yacine Haddad',
                      '#1046 · Sara Meziane',
                    ])
                      _Row(
                        children: [
                          Text(
                            row,
                            style: const TextStyle(fontWeight: FontWeight.w700),
                          ),
                          const _Tag('New'),
                        ],
                      ),
                  ],
                ),
              ),
            },
          ),
        ),
      ],
    ),
  );
}

/// Loading: one calm loader that says what is loading. No spinner per row, no skeleton flicker.
class _OrdersLoading extends StatelessWidget {
  const _OrdersLoading();

  @override
  Widget build(BuildContext context) => const _StateBox(
    children: [
      PixelLoader(size: 32, label: 'Loading orders'),
      _Body('Loading orders…'),
    ],
  );
}

/// Empty: what this place is for and the first step, never just “No data”.
class _OrdersEmpty extends StatelessWidget {
  const _OrdersEmpty();

  @override
  Widget build(BuildContext context) => _StateBox(
    children: [
      const _Heading('No orders yet'),
      const _Body(
        'Orders from your store, Instagram and Facebook land here. Share your store link to get the first one.',
      ),
      Wrap(
        spacing: 8,
        runSpacing: 8,
        alignment: WrapAlignment.center,
        children: [
          Button(
            variant: .tonal,
            onClick: () {},
            children: const [
              LucideIcon(LucideIcons.link2),
              Text('Copy store link'),
            ],
          ),
          Button(
            variant: .text,
            onClick: () {},
            children: const [
              LucideIcon(LucideIcons.plus),
              Text('Add an order by hand'),
            ],
          ),
        ],
      ),
    ],
  );
}

/// Error: what failed, that nothing was lost, and a way forward.
class _OrdersError extends StatelessWidget {
  const _OrdersError({required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => _StateBox(
    children: [
      const _Heading('Orders didn’t load'),
      const _Body(
        'The connection dropped before we got your orders. Nothing was lost; try again.',
      ),
      Button(
        variant: .tonal,
        onClick: onRetry,
        children: const [LucideIcon(LucideIcons.rotateCw), Text('Try again')],
      ),
    ],
  );
}

/// `.pt-state`: centred column, 12px gaps, at least 300px tall, 24px padding.
class _StateBox extends StatelessWidget {
  const _StateBox({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) => ConstrainedBox(
    constraints: const BoxConstraints(
      minHeight: 300,
      minWidth: double.infinity,
    ),
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        mainAxisSize: MainAxisSize.min,
        spacing: 12,
        children: children,
      ),
    ),
  );
}

/// `.pt-state h4`: 17px kit heading.
class _Heading extends StatelessWidget {
  const _Heading(this.text);

  final String text;

  @override
  Widget build(BuildContext context) => Semantics(
    header: true,
    child: Text(
      text,
      textAlign: TextAlign.center,
      style: const TextStyle(
        fontSize: 17,
        fontWeight: FontWeight.w500,
        letterSpacing: 17 * -0.035,
        height: 19 / 17,
        leadingDistribution: TextLeadingDistribution.even,
      ),
    ),
  );
}

/// `.pt-state p`: muted, at most 340px wide.
class _Body extends StatelessWidget {
  const _Body(this.text);

  final String text;

  @override
  Widget build(BuildContext context) => ConstrainedBox(
    constraints: const BoxConstraints(maxWidth: 340),
    child: Text(
      text,
      textAlign: TextAlign.center,
      style: TextStyle(color: ThemeProvider.of(context).colors.muted),
    ),
  );
}

/// `.pt-frame`: a bounded 14px surface with a superellipse panel corner.
class _Frame extends StatelessWidget {
  const _Frame({required this.height, required this.child});

  final double height;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    return Container(
      width: double.infinity,
      height: height,
      clipBehavior: Clip.antiAlias,
      alignment: AlignmentDirectional.topStart,
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

/// `.pt-row`: a bordered row, content at both ends.
class _Row extends StatelessWidget {
  const _Row({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 14),
      decoration: ShapeDecoration(
        color: theme.colors.surface,
        shape: SuperellipseBorder(
          radius: theme.sizes.radiusSmall,
          side: BorderSide(color: theme.colors.line),
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        spacing: 12,
        children: children,
      ),
    );
  }
}

/// `.pt-tag`: a quiet 12px pill.
class _Tag extends StatelessWidget {
  const _Tag(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 2, horizontal: 8),
      decoration: BoxDecoration(
        color: theme.colors.surfaceSoft,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        text,
        style: TextStyle(fontSize: 12, color: theme.colors.muted),
      ),
    );
  }
}
