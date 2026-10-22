import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class OrderDetail extends StatefulWidget {
  const OrderDetail({super.key});

  @override
  State<OrderDetail> createState() => _OrderDetailState();
}

class _OrderDetailState extends State<OrderDetail> {
  bool _detailsOpen = false;
  bool _confirmed = false;

  @override
  Widget build(BuildContext context) => _Frame(
    // Below 640px the inspector lives in a dialog.
    child: LayoutBuilder(
      builder: (context, constraints) {
        final narrow = constraints.maxWidth < 640;
        final rtl = Directionality.of(context) == TextDirection.rtl;
        return Stack(
          children: [
            Positioned.fill(
              child: ScrollArea(
                label: 'Order #1048',
                top: Toolbar(
                  label: 'Order toolbar',
                  leading: ToolbarGroup(
                    label: 'Navigation',
                    children: [
                      IconButton(
                        variant: .text,
                        appearance: .toolbar,
                        controlSize: .compact,
                        ariaLabel: 'Back to orders',
                        onClick: () {},
                        icon: Transform.flip(
                          flipX: rtl,
                          child: const LucideIcon(LucideIcons.arrowLeft),
                        ),
                      ),
                      // `.pt-title`: up to 200px, 10px inline padding, 600 weight, ellipsis.
                      ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 200),
                        child: const Padding(
                          padding: EdgeInsets.symmetric(horizontal: 10),
                          child: Text(
                            'Order #1048',
                            maxLines: 1,
                            softWrap: false,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(fontWeight: FontWeight.w600),
                          ),
                        ),
                      ),
                    ],
                  ),
                  trailing: ToolbarGroup(
                    label: 'Order tools',
                    children: [
                      IconButton(
                        variant: .text,
                        appearance: .toolbar,
                        controlSize: .compact,
                        ariaLabel: 'Call Amina Benali',
                        onClick: () {},
                        icon: const LucideIcon(LucideIcons.phone),
                      ),
                      IconButton(
                        variant: .text,
                        appearance: .toolbar,
                        controlSize: .compact,
                        ariaLabel: 'Print shipping label',
                        onClick: () {},
                        icon: const LucideIcon(LucideIcons.printer),
                      ),
                      if (narrow)
                        IconButton(
                          variant: .text,
                          appearance: .toolbar,
                          controlSize: .compact,
                          ariaLabel: 'Order details',
                          onClick: () => setState(() => _detailsOpen = true),
                          icon: const LucideIcon(LucideIcons.panelRight),
                        ),
                    ],
                  ),
                ),
                bottom: Dock(
                  label: 'Order actions',
                  // On a phone the call count is already in the content; the dock keeps its width
                  // for the actions.
                  content: narrow
                      ? null
                      : Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 8),
                          child: Text(
                            _confirmed ? 'Confirmed' : 'Call 3 of 5',
                            softWrap: false,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                  children: [
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      spacing: 4,
                      children: [
                        Button(
                          variant: .tonal,
                          onClick: () {},
                          children: const [Text('Call back later')],
                        ),
                        Button(
                          variant: .filled,
                          onClick: () =>
                              setState(() => _confirmed = !_confirmed),
                          children: [
                            Text(_confirmed ? 'Undo confirm' : 'Confirm order'),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  spacing: 16,
                  children: [
                    Expanded(child: _Main(confirmed: _confirmed)),
                    if (!narrow)
                      const SizedBox(
                        width: 240,
                        child: _Card(
                          label: 'Order details',
                          title: 'Details',
                          children: [_OrderFacts()],
                        ),
                      ),
                  ],
                ),
              ),
            ),
            Modal(
              open: _detailsOpen && narrow,
              close: () => setState(() => _detailsOpen = false),
              label: 'Order details',
              scrollable: true,
              child: const _OrderFacts(),
            ),
          ],
        );
      },
    ),
  );
}

class _Main extends StatelessWidget {
  const _Main({required this.confirmed});

  final bool confirmed;

  @override
  Widget build(BuildContext context) {
    final muted = ThemeProvider.of(context).colors.muted;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // `.pt-main h3`: 22px kit heading, 4px above.
        Padding(
          padding: const EdgeInsets.only(top: 4),
          child: Semantics(
            header: true,
            child: const Text(
              'Amina Benali',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w500,
                letterSpacing: 22 * -0.035,
                height: 1.12,
                leadingDistribution: TextLeadingDistribution.even,
              ),
            ),
          ),
        ),
        const SizedBox(height: 12),
        Text(
          'Placed yesterday at 18:03 from Instagram',
          style: TextStyle(color: muted),
        ),
        const SizedBox(height: 12),
        const _Card(
          label: 'Products',
          title: 'Products',
          children: [
            _Line(start: Text('Wireless earbuds Pro × 1'), end: '4 900 DA'),
            _Line(start: Text('Silicone case, black × 2'), end: '2 400 DA'),
            _Line(start: Text('USB-C fast charger × 1'), end: '1 700 DA'),
          ],
        ),
        const SizedBox(height: 12),
        _Card(
          label: 'Calls',
          title:
              'Confirmation calls · ${confirmed ? 'confirmed' : 'attempt 3 of 5'}',
          children: [
            _Line(
              start: const Text('No answer'),
              end: 'Today, 10:42',
              muted: true,
            ),
            _Line(
              start: const Text('Asked to call back after 10:30'),
              end: 'Today, 09:15',
              muted: true,
            ),
          ],
        ),
        const SizedBox(height: 12),
        const _Card(
          label: 'Customer note',
          title: 'Note from the customer',
          children: [
            Text(
              '“Please call before coming, the building has no name on the door.”',
            ),
          ],
        ),
      ],
    );
  }
}

class _OrderFacts extends StatelessWidget {
  const _OrderFacts();

  static const _facts = [
    ('Status', 'Waiting for confirmation'),
    ('Phone', '0555 12 34 56'),
    ('Wilaya', '16 · Alger, Bab Ezzouar'),
    ('Courier', 'Yalidine · home delivery'),
    ('Delivery fee', '600 DA'),
    ('Total to collect', '9 600 DA'),
  ];

  @override
  Widget build(BuildContext context) {
    final muted = ThemeProvider.of(context).colors.muted;
    // `.pt-facts`: term (13px, muted) over value, 10px between facts.
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 10,
      children: [
        for (final (term, value) in _facts)
          MergeSemantics(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(term, style: TextStyle(fontSize: 13, color: muted)),
                Text(value),
              ],
            ),
          ),
      ],
    );
  }
}

/// `.pt-card`: a bordered surface, 14px padding, 8px gaps, 15px heading.
class _Card extends StatelessWidget {
  const _Card({
    required this.label,
    required this.title,
    required this.children,
  });

  final String label, title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    return Semantics(
      container: true,
      label: label,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: ShapeDecoration(
          color: theme.colors.surface,
          shape: SuperellipseBorder(
            radius: theme.sizes.radiusSmall,
            side: BorderSide(color: theme.colors.line),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          spacing: 8,
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
            ...children,
          ],
        ),
      ),
    );
  }
}

/// `.pt-line`: both ends of a line under a top rule; the end never wraps.
class _Line extends StatelessWidget {
  const _Line({required this.start, required this.end, this.muted = false});

  final Widget start;
  final String end;
  final bool muted;

  @override
  Widget build(BuildContext context) {
    final c = ThemeProvider.of(context).colors;
    return Container(
      padding: const EdgeInsets.only(top: 8),
      decoration: BoxDecoration(
        border: Border(top: BorderSide(color: c.line)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        spacing: 12,
        children: [
          Flexible(child: start),
          Text(
            end,
            softWrap: muted,
            style: muted
                ? TextStyle(color: c.muted)
                : const TextStyle(fontWeight: FontWeight.w700),
          ),
        ],
      ),
    );
  }
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
