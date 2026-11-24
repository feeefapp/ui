import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

const _pages = [
  (label: 'Products', icon: LucideIcons.package),
  (label: 'Deliveries', icon: LucideIcons.truck),
  (label: 'Customers', icon: LucideIcons.users),
];

/// Order rooms: the expandable Orders group. `null` is every order.
const _rooms = [
  (id: null, label: 'All orders', icon: LucideIcons.listChecks),
  (id: 'open', label: 'Open', icon: LucideIcons.inbox),
  (id: 'confirmed', label: 'Confirmed', icon: LucideIcons.phoneCall),
  (id: 'shipped', label: 'Shipped', icon: LucideIcons.send),
  (id: 'delivered', label: 'Delivered', icon: LucideIcons.packageCheck),
];

const _orders = [
  (
    id: '#1048',
    customer: 'Amina Benali',
    city: 'Alger',
    total: '4 500 DA',
    room: 'open',
  ),
  (
    id: '#1047',
    customer: 'Yacine Haddad',
    city: 'Oran',
    total: '2 900 DA',
    room: 'open',
  ),
  (
    id: '#1046',
    customer: 'Sara Meziane',
    city: 'Constantine',
    total: '7 200 DA',
    room: 'confirmed',
  ),
  (
    id: '#1045',
    customer: 'Karim Saidi',
    city: 'Blida',
    total: '3 100 DA',
    room: 'shipped',
  ),
  (
    id: '#1044',
    customer: 'Lina Cherif',
    city: 'Sétif',
    total: '5 650 DA',
    room: 'shipped',
  ),
  (
    id: '#1043',
    customer: 'Omar Belkacem',
    city: 'Annaba',
    total: '1 800 DA',
    room: 'delivered',
  ),
];

/// Sidebar geometry, shared with the merchant app's sidebar (one design family).
/// Row height: 10 px under the 48 px interactive minimum.
const double _rowSide = 38;

/// Corner radius of a sidebar row.
const double _itemRadius = 15;

/// Corner radius of an expanded group's background: a step under the sidebar panel's 24.
const double _groupRadius = 18;

/// Inset of the rows inside an expanded group, each side.
const double _groupInset = 8;

/// Corner radius of a row inside a group: concentric with the group's corners.
const double _nestedRadius = _groupRadius - _groupInset;

/// Height of the footer's avatar and wallet glass chips.
const double _chipHeight = 44;

class Workspace extends StatefulWidget {
  const Workspace({super.key});

  @override
  State<Workspace> createState() => _WorkspaceState();
}

class _WorkspaceState extends State<Workspace> {
  String _page = 'Orders';
  String? _room;
  bool _ordersOpen = true;

  String get _title => _page == 'Orders'
      ? _rooms.firstWhere((room) => room.id == _room).label
      : _page;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final c = theme.colors;
    final orders = _orders.where((o) => _room == null || o.room == _room);
    return _Frame(
      // The demo frame is a small page, so it switches to the drawer below 560px instead of 720px.
      child: Scaffold(
        contentLabel: _title,
        compactBreakpoint: 560,
        // The page fills the window and the glass sidebar floats over it.
        extendBodyBehindSidebar: true,
        // Slots read the scaffold state: here the sidebar knows when it is a rail.
        side: Builder(
          builder: (context) {
            final state = Scaffold.of(context);
            final rail =
                state.sideMode == ScaffoldSideMode.rail && !state.drawerOpen;
            void select(String page, [String? room]) {
              setState(() {
                _page = page;
                _room = room;
              });
              state.setDrawerOpen(false);
            }

            // Sidebar only: its scrollbar shows while scrolling or hovering, then fades out.
            return ScrollConfiguration(
              behavior: const _AutoHideScrollbar(),
              child: ScaffoldSide(
                leading: ConstrainedBox(
                  constraints: const BoxConstraints(minHeight: 44),
                  child: Padding(
                    padding: const EdgeInsetsDirectional.only(start: 10),
                    child: Row(
                      spacing: 8,
                      children: [
                        if (!rail)
                          const Expanded(
                            child: Text(
                              'Atlas Store',
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          )
                        else
                          const Spacer(),
                        if (!state.drawerOpen) const ScaffoldToggleButton(),
                      ],
                    ),
                  ),
                ),
                trailing: _AccountRow(compact: rail),
                child: Semantics(
                  container: true,
                  label: 'Store pages',
                  // Rows: 38px, radius 15, muted ink; the current page is a flat ink tint.
                  child: ControlOverrides.merge(
                    context,
                    height: _rowSide,
                    radius: _itemRadius,
                    ink: c.muted,
                    pressedFill: c.ink.withValues(alpha: 0.06),
                    pressedEdge: const Color(0x00000000),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      spacing: 4,
                      children: [
                        _OrdersGroup(
                          compact: rail,
                          active: _page == 'Orders',
                          open: _ordersOpen,
                          room: _room,
                          onToggle: () =>
                              setState(() => _ordersOpen = !_ordersOpen),
                          onRoom: (room) => select('Orders', room),
                        ),
                        for (final item in _pages)
                          _NavRow(
                            active: _page == item.label,
                            child: NavigationItem(
                              compact: rail,
                              label: item.label,
                              icon: LucideIcon(item.icon),
                              active: _page == item.label,
                              onSelect: () => select(item.label),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              ),
            );
          },
        ),
        appBar: Builder(
          builder: (context) {
            final state = Scaffold.of(context);
            return ScaffoldAppBar(
              leading:
                  state.compact || state.sideMode == ScaffoldSideMode.hidden
                  ? const ToolbarGroup(
                      label: 'Navigation',
                      children: [ScaffoldToggleButton()],
                    )
                  : null,
              trailing: ToolbarGroup(
                label: 'Page actions',
                children: [
                  IconButton(
                    variant: .text,
                    appearance: .toolbar,
                    ariaLabel: 'Search orders',
                    onClick: () {},
                    icon: const LucideIcon(LucideIcons.search),
                  ),
                ],
              ),
              child: ToolbarGroup(
                label: 'Current page',
                children: [
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    child: Text(
                      _title,
                      maxLines: 1,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            );
          },
        ),
        bottom: Dock(
          label: 'Order actions',
          children: [
            Button(
              variant: .filled,
              onClick: () {},
              children: const [LucideIcon(LucideIcons.plus), Text('New order')],
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          spacing: 8,
          children: [
            for (final order in orders)
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 12,
                ),
                decoration: BoxDecoration(
                  color: c.surface,
                  border: Border.all(color: c.line),
                  borderRadius: BorderRadius.circular(theme.sizes.radiusSmall),
                ),
                child: DefaultTextStyle.merge(
                  style: const TextStyle(fontSize: 13),
                  child: Row(
                    spacing: 12,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          spacing: 2,
                          children: [
                            Text(
                              '${order.id} · ${order.customer}',
                              style: const TextStyle(
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            Text(
                              '${order.city} · Cash on delivery',
                              style: TextStyle(
                                fontSize: 13 / 1.2,
                                color: c.muted,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Text(
                        order.total,
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// A sidebar row with its leading marker: a 4px dot at rest that grows into a thin 2×25 ink bar
/// on the current page. Group headers pass `active: null` (no marker).
class _NavRow extends StatelessWidget {
  const _NavRow({required this.active, required this.child});
  final bool? active;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final on = active;
    if (on == null) return child;
    final c = ThemeProvider.of(context).colors;
    return Stack(
      children: [
        child,
        PositionedDirectional(
          start: 0,
          top: 0,
          bottom: 0,
          child: IgnorePointer(
            child: Center(
              // animation_level: 1 — the marker grows from a dot into the bar.
              child: AnimatedContainer(
                margin: const EdgeInsets.symmetric(horizontal: 3),
                duration: reducedMotionOf(context)
                    ? Duration.zero
                    : const Duration(milliseconds: 200),
                width: on ? 2 : 4,
                height: on ? 25 : 4,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(28),
                  color: on ? c.ink : c.muted,
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

/// Orders as an expandable group of rooms. Expanded on the current page, it sits on muted
/// liquid glass with its rows inset 8px and their corners concentric with the group's.
class _OrdersGroup extends StatelessWidget {
  const _OrdersGroup({
    required this.compact,
    required this.active,
    required this.open,
    required this.room,
    required this.onToggle,
    required this.onRoom,
  });

  final bool compact, active, open;
  final String? room;
  final VoidCallback onToggle;
  final void Function(String? room) onRoom;

  @override
  Widget build(BuildContext context) {
    final c = ThemeProvider.of(context).colors;
    // In the rail the group is one row that opens every order.
    if (compact) {
      return _NavRow(
        active: active,
        child: NavigationItem(
          compact: true,
          label: 'Orders',
          icon: const LucideIcon(LucideIcons.shoppingBag),
          active: active,
          onSelect: () => onRoom(null),
        ),
      );
    }
    final reduced = reducedMotionOf(context);
    final duration = reduced ? Duration.zero : const Duration(milliseconds: 200);
    final accents = <String?, Color>{
      null: c.muted,
      'open': c.warning,
      'confirmed': c.primary,
      'shipped': c.accent,
      'delivered': c.success,
    };
    return _SubduedGlass(
      active: active,
      radius: _groupRadius,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // The header is never the current page; the group's glass is.
          NavigationItem(
            compact: false,
            label: 'Orders',
            icon: const LucideIcon(LucideIcons.shoppingBag),
            onSelect: onToggle,
            // animation_level: 1 — the chevron turns with the group.
            trailing: AnimatedRotation(
              turns: open ? 0.25 : 0,
              duration: duration,
              child: const LucideIcon(LucideIcons.chevronDown, size: 16),
            ),
          ),
          // animation_level: 2 — the rooms fold in and out under the header.
          AnimatedCrossFade(
            firstChild: const SizedBox(width: double.infinity),
            secondChild: Padding(
              // 4 + 4 = the 8px inset, even on both sides.
              padding: const EdgeInsets.all(4).add(
                const EdgeInsets.symmetric(horizontal: _groupInset - 4),
              ),
              child: ControlOverrides.merge(
                context,
                radius: _nestedRadius,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    for (final r in _rooms)
                      _NavRow(
                        active: active && room == r.id,
                        child: NavigationItem(
                          compact: false,
                          label: r.label,
                          icon: LucideIcon(
                            r.icon,
                            color: active && room == r.id
                                ? accents[r.id]
                                : accents[r.id]!.withValues(alpha: 0.78),
                          ),
                          active: active && room == r.id,
                          onSelect: () => onRoom(r.id),
                          trailing: _CountPill(
                            count: _orders
                                .where((o) => r.id == null || o.room == r.id)
                                .length,
                            color: accents[r.id]!,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
            crossFadeState: open
                ? CrossFadeState.showSecond
                : CrossFadeState.showFirst,
            duration: duration,
            sizeCurve: Curves.easeInOut,
          ),
        ],
      ),
    );
  }
}

/// A room's order count: a small pill in the room's colour.
class _CountPill extends StatelessWidget {
  const _CountPill({required this.count, required this.color});
  final int count;
  final Color color;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 3),
    constraints: const BoxConstraints(minWidth: 18, minHeight: 18),
    alignment: Alignment.center,
    decoration: BoxDecoration(
      color: color,
      borderRadius: BorderRadius.circular(10),
    ),
    child: Text(
      '$count',
      style: TextStyle(
        fontSize: 10,
        height: 1,
        fontWeight: FontWeight.w900,
        color: color.computeLuminance() > 0.5
            ? const Color(0xff000000)
            : const Color(0xffffffff),
      ),
    ),
  );
}

/// Muted liquid glass behind an active group: the kit's glass (blur, rim, refraction) under a
/// dark veil, so it reads as soft glass rather than a glowing panel. Paints behind [child] only.
class _SubduedGlass extends StatelessWidget {
  const _SubduedGlass({
    required this.active,
    required this.radius,
    required this.child,
  });

  final bool active;
  final double radius;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final dark = ThemeProvider.of(context).brightness == Brightness.dark;
    return Stack(
      children: [
        Positioned.fill(
          child: IgnorePointer(
            child: ExcludeSemantics(
              // animation_level: 1 — the glass fades in/out with the group's active state.
              child: AnimatedOpacity(
                opacity: active ? 1 : 0,
                duration: reducedMotionOf(context)
                    ? Duration.zero
                    : const Duration(milliseconds: 200),
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    GlassContainer(
                      light: GlassLightMode.static,
                      interactive: false,
                      adaptive: false,
                      child: GlassMemberBox(
                        motion: GlassMotion.follow,
                        radius: radius,
                        standalone: (child) => child,
                        child: const SizedBox.expand(),
                      ),
                    ),
                    // The veil that mutes the glass's light, on the kit's own corner curve so
                    // the bright rim never pokes out.
                    DecoratedBox(
                      decoration: ShapeDecoration(
                        color: const Color(
                          0xff000000,
                        ).withValues(alpha: dark ? 0.38 : 0.06),
                        shape: SuperellipseBorder(radius: radius),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
        child,
      ],
    );
  }
}

/// The sidebar footer: account avatar and wallet balance as two 44px bubbles of one glass
/// container. The rail keeps only the avatar.
class _AccountRow extends StatelessWidget {
  const _AccountRow({required this.compact});
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final c = ThemeProvider.of(context).colors;
    // The avatar is bare (no ring of its own): the glass bubble is its chrome.
    final avatar = SizedBox.square(
      dimension: _chipHeight,
      child: GlassGroup(
        radius: _chipHeight / 2,
        child: ControlOverrides.merge(
          context,
          height: _chipHeight - 2,
          radius: (_chipHeight - 2) / 2,
          child: IconButton(
            appearance: .toolbar,
            ariaLabel: 'Account',
            onClick: () {},
            icon: const LucideIcon(LucideIcons.user),
          ),
        ),
      ),
    );
    final wallet = SizedBox(
      height: _chipHeight,
      child: GlassGroup(
        radius: _chipHeight / 2,
        child: ControlOverrides.merge(
          context,
          height: _chipHeight - 2,
          radius: (_chipHeight - 2) / 2,
          child: Button(
            appearance: .toolbar,
            ariaLabel: 'Wallet: 12 400 DA',
            onClick: () {},
            padding: const EdgeInsetsDirectional.only(start: 11, end: 15),
            gap: 8,
            children: [
              LucideIcon(LucideIcons.wallet, color: c.primary),
              Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Wallet',
                    style: TextStyle(fontSize: 10, height: 1.1, color: c.muted),
                  ),
                  Text(
                    '12 400 DA',
                    style: TextStyle(
                      fontSize: 14,
                      height: 1.2,
                      fontWeight: FontWeight.w600,
                      color: c.ink,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
    return GlassContainer(
      light: GlassLightMode.static,
      adaptive: false,
      child: compact
          ? Center(child: avatar)
          : Row(children: [avatar, const Spacer(), wallet]),
    );
  }
}

/// Auto-hiding scrollbar for the sidebar's scroll area: the thumb appears on scroll or hover and
/// fades ~1 s after the last scroll. Horizontal scrollables keep none.
class _AutoHideScrollbar extends ScrollBehavior {
  const _AutoHideScrollbar();

  @override
  Widget buildScrollbar(
    BuildContext context,
    Widget child,
    ScrollableDetails details,
  ) {
    if (axisDirectionToAxis(details.direction) != Axis.vertical) return child;
    final c = ThemeProvider.of(context).colors;
    // animation_level: 1 — the framework's thumb fade (no custom motion).
    return RawScrollbar(
      controller: details.controller,
      thumbVisibility: false,
      trackVisibility: false,
      interactive: true,
      thickness: 6,
      radius: const Radius.circular(3),
      thumbColor: c.muted.withValues(alpha: 0.5),
      timeToFade: const Duration(seconds: 1),
      child: child,
    );
  }
}

/// `.scaffold-demo-frame`: a scaffold fills its parent, so the demo gets a bounded box.
class _Frame extends StatelessWidget {
  const _Frame({required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final radius = BorderRadius.circular(theme.sizes.radiusPanel);
    return Container(
      width: double.infinity,
      height: 420,
      foregroundDecoration: BoxDecoration(
        border: Border.all(color: theme.colors.line),
        borderRadius: radius,
      ),
      decoration: BoxDecoration(
        color: theme.colors.ground,
        borderRadius: radius,
      ),
      clipBehavior: Clip.antiAlias,
      child: Padding(padding: const EdgeInsets.all(1), child: child),
    );
  }
}
