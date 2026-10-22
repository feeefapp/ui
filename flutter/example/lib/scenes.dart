import 'package:feeef_ui/feeef_ui.dart';
import 'package:feeef_ui/theme/css_text.dart';
import 'package:flutter/widgets.dart' hide Action, RadioGroup;

import 'brand_scenes.dart';

// Tab is the kit's (a TabView destination).

/// Scenes shared with parity/src/scenes.tsx: same ids, same content, same layout. Each is a column
/// of rows (wrapping, 12px gap) in a 720px stage with 24px padding.
final Map<String, List<Widget> Function()> scenes = {
  'buttons': () => [
    row([
      Button(
        variant: .filled,
        onClick: _noop,
        children: const [Text('Filled')],
      ),
      Button(variant: .tonal, onClick: _noop, children: const [Text('Tonal')]),
      Button(
        variant: .elevated,
        onClick: _noop,
        children: const [Text('Elevated')],
      ),
      Button(
        variant: .outlined,
        onClick: _noop,
        children: const [Text('Outlined')],
      ),
      Button(variant: .text, onClick: _noop, children: const [Text('Text')]),
      Button(variant: .ghost, onClick: _noop, children: const [Text('Ghost')]),
      Button(
        variant: .destructive,
        onClick: _noop,
        children: const [Text('Delete')],
      ),
    ]),
  ],
  'button-states': () => [
    row([
      Button(
        variant: .filled,
        controlSize: .compact,
        onClick: _noop,
        children: const [Text('Compact')],
      ),
      Button(
        variant: .elevated,
        controlSize: .compact,
        onClick: _noop,
        children: const [Text('Compact')],
      ),
      Button(
        variant: .tonal,
        pressed: true,
        onClick: _noop,
        children: const [Text('Selected')],
      ),
      Button(
        variant: .elevated,
        disabled: true,
        onClick: _noop,
        children: const [Text('Disabled')],
      ),
    ]),
    row([
      Button(
        variant: .filled,
        appearance: .toolbar,
        onClick: _noop,
        children: const [Text('Toolbar filled')],
      ),
      Button(
        variant: .elevated,
        appearance: .toolbar,
        onClick: _noop,
        children: const [Text('Toolbar elevated')],
      ),
      Button(
        variant: .outlined,
        appearance: .toolbar,
        onClick: _noop,
        children: const [Text('Toolbar outlined')],
      ),
    ]),
    row([
      Button(
        variant: .filled,
        loading: true,
        onClick: _noop,
        children: const [Text('Saving')],
      ),
      Button(
        variant: .elevated,
        loading: true,
        onClick: _noop,
        children: const [Text('Syncing')],
      ),
      IconButton(
        variant: .elevated,
        loading: true,
        ariaLabel: 'Refresh',
        onClick: _noop,
        icon: const LucideSearch(),
      ),
    ]),
  ],
  'segmented': () => [const _Segmented()],
  'glass': () => [
    GlassGroup(
      padding: const EdgeInsets.all(6),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        spacing: 4,
        children: [
          Button(
            appearance: .toolbar,
            variant: .ghost,
            onClick: _noop,
            children: const [Text('Drafts')],
          ),
          Button(
            appearance: .toolbar,
            variant: .filled,
            onClick: _noop,
            children: const [Text('Publish')],
          ),
        ],
      ),
    ),
    Toolbar(
      label: 'Editor',
      leading: ToolbarGroup(
        label: 'Format',
        children: [
          for (final (label, icon) in const [
            ('Undo', LucideUndo2()),
            ('Redo', LucideRedo2()),
            ('Bold', LucideBold()),
            ('Italic', LucideItalic()),
            ('Underline', LucideUnderline()),
          ])
            IconButton(
              appearance: .toolbar,
              controlSize: .compact,
              ariaLabel: label,
              onClick: _noop,
              icon: icon,
            ),
        ],
      ),
      trailing: ToolbarGroup(
        label: 'Share',
        children: [
          Button(
            appearance: .toolbar,
            controlSize: .compact,
            variant: .filled,
            onClick: _noop,
            children: const [LucideShare(size: 18), Text('Share')],
          ),
        ],
      ),
    ),
    GlassContainer(
      spacing: 16,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        spacing: 10,
        children: [
          ToolbarGroup(
            label: 'Zoom',
            children: [
              IconButton(
                appearance: .toolbar,
                controlSize: .compact,
                ariaLabel: 'Undo',
                onClick: _noop,
                icon: const LucideUndo2(),
              ),
              IconButton(
                appearance: .toolbar,
                controlSize: .compact,
                ariaLabel: 'Redo',
                onClick: _noop,
                icon: const LucideRedo2(),
              ),
            ],
          ),
          ToolbarGroup(
            label: 'Style',
            children: [
              IconButton(
                appearance: .toolbar,
                controlSize: .compact,
                ariaLabel: 'Bold',
                onClick: _noop,
                icon: const LucideBold(),
              ),
            ],
          ),
        ],
      ),
    ),
    GlassContainer(
      spacing: 16,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        spacing: 4,
        children: [
          SegmentedControl<String>(
            label: 'View',
            value: 'grid',
            onChange: (_) {},
            options: const [
              SegmentOption(value: 'list', label: 'List'),
              SegmentOption(value: 'grid', label: 'Grid'),
            ],
          ),
          ToolbarGroup(
            label: 'Add',
            children: [
              IconButton(
                appearance: .toolbar,
                controlSize: .compact,
                ariaLabel: 'Bold',
                onClick: _noop,
                icon: const LucideBold(),
              ),
            ],
          ),
        ],
      ),
    ),
  ],
  'dock': () => [
    Builder(
      builder: (context) => Dock(
        label: 'Order',
        content: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Order #1042',
              style: TextStyle(fontWeight: FontWeight.w700),
            ),
            Text(
              '3 items · 4,500 DZD',
              style: TextStyle(
                fontSize: 11,
                color: ThemeProvider.of(context).colors.muted,
              ),
            ),
          ],
        ),
        children: [
          Button(
            variant: .tonal,
            controlSize: .compact,
            onClick: _noop,
            children: const [LucidePrinter(size: 18), Text('Print')],
          ),
          Button(
            variant: .filled,
            controlSize: .compact,
            onClick: _noop,
            children: const [LucideTruck(size: 18), Text('Ship')],
          ),
        ],
      ),
    ),
    Dock(
      label: 'Selection',
      align: .start,
      content: const Text('2 selected'),
      children: [
        IconButton(
          controlSize: .compact,
          ariaLabel: 'Clear',
          onClick: _noop,
          icon: const LucideX(),
        ),
      ],
    ),
  ],
  'popover': () => [
    Builder(
      builder: (context) {
        Widget item(String label, [Color? color]) => Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          child: CssBaseline(
            lineHeight: 20,
            child: Text(label, style: TextStyle(color: color)),
          ),
        );
        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          spacing: 12,
          children: [
            SizedBox(
              width: 240,
              child: PopoverSurface(
                padding: const EdgeInsets.all(8),
                child: DefaultTextStyle.merge(
                  style: const TextStyle(
                    fontSize: 14,
                    height: 20 / 14,
                    leadingDistribution: TextLeadingDistribution.even,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      item('Duplicate'),
                      item('Move to archive'),
                      item(
                        'Delete order',
                        ThemeProvider.of(context).colors.danger,
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(
              width: 200,
              height: 120,
              child: PopoverSurface(
                seed: 'lab-popover-2',
                child: SizedBox.expand(),
              ),
            ),
          ],
        );
      },
    ),
  ],
  'scroll': () => [
    Builder(
      builder: (context) {
        final theme = ThemeProvider.of(context);
        final c = theme.colors;
        return Container(
          height: 300,
          decoration: ShapeDecoration(
            color: c.surface,
            shape: SuperellipseBorder(
              radius: theme.sizes.radiusPanel,
              side: BorderSide(color: c.line),
            ),
          ),
          // The decoration's 1px border already insets the child.
          child: ClipPath(
            clipper: ShapeBorderClipper(
              shape: SuperellipseBorder(radius: theme.sizes.radiusPanel - 1),
            ),
            child: ScrollArea(
              label: 'Orders',
              top: ToolbarGroup(
                label: 'Filters',
                children: [
                  Button(
                    variant: .ghost,
                    appearance: .toolbar,
                    controlSize: .compact,
                    onClick: _noop,
                    children: const [Text('All')],
                  ),
                  Button(
                    variant: .ghost,
                    appearance: .toolbar,
                    controlSize: .compact,
                    onClick: _noop,
                    children: const [Text('Open')],
                  ),
                ],
              ),
              bottom: Dock(
                label: 'Orders',
                content: const Text('24 orders'),
                children: [
                  Button(
                    variant: .filled,
                    controlSize: .compact,
                    onClick: _noop,
                    children: const [Text('New order')],
                  ),
                ],
              ),
              child: DefaultTextStyle.merge(
                style: const TextStyle(
                  fontSize: 14,
                  height: 20 / 14,
                  leadingDistribution: TextLeadingDistribution.even,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    for (var i = 0; i < 12; i++)
                      // Container adds the border to the padding, like the CSS box.
                      Container(
                        decoration: BoxDecoration(
                          border: Border(bottom: BorderSide(color: c.line)),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          child: CssBaseline(
                            lineHeight: 20,
                            child: Text('Order #${1040 + i}'),
                          ),
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
  ],
  'numbers': () => [
    grid(const [
      NumberField(label: 'Quantity', defaultValue: 3, min: 1),
      NumberField(
        label: 'Discount',
        defaultValue: 25,
        min: 0,
        max: 100,
        step: 5,
        unit: '%',
      ),
      NumberField(
        label: 'Price',
        defaultValue: 2500,
        step: 50,
        unit: 'DZD',
        variant: .outlined,
      ),
      NumberField(
        label: 'Weight',
        defaultValue: 1.25,
        step: 0.25,
        unit: 'kg',
        controlSize: .compact,
        steppers: false,
      ),
      NumberField(
        label: 'Volume',
        defaultValue: 40,
        min: 0,
        max: 100,
        disabled: true,
      ),
    ]),
  ],
  'actions': () {
    final actions = <Action>[
      CommandAction(
        id: 'print',
        label: 'Print',
        icon: const LucidePrinter(),
        onAction: _noop,
      ),
      CommandAction(
        id: 'ship',
        label: 'Ship',
        icon: const LucideTruck(),
        variant: .filled,
        priority: 2,
        onAction: _noop,
      ),
      ToggleAction(
        id: 'cod',
        label: 'Cash on delivery',
        checked: true,
        onCheckedChange: (_) {},
      ),
      CommandAction(
        id: 'archive',
        label: 'Archive',
        icon: const LucideArchive(),
        priority: -1,
        onAction: _noop,
      ),
      CommandAction(
        id: 'delete',
        label: 'Delete',
        destructive: true,
        priority: -2,
        onAction: _noop,
      ),
    ];
    return [
      SizedBox(
        width: 672,
        child: ActionsBar(label: 'Order actions', actions: actions),
      ),
      SizedBox(
        width: 300,
        child: ActionsBar(label: 'Order actions', actions: actions),
      ),
      SizedBox(
        width: 300,
        child: ActionsBar(
          label: 'Order actions',
          actions: actions,
          size: .compact,
          align: .start,
        ),
      ),
    ];
  },
  'list': () => [
    Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ListSection(
          header: const Text('Store'),
          footer: const Text('Shown on receipts and the storefront.'),
          children: [
            ListRow(
              leading: const LucideStore(),
              title: const Text('Name'),
              trailing: const Text('Amina shop'),
              chevron: true,
              onClick: _noop,
            ),
            ListRow(
              leading: const LucidePhone(),
              title: const Text('Phone'),
              subtitle: const Text('Shown to couriers'),
              trailing: const Text('0555 12 34 56'),
              chevron: true,
              onClick: _noop,
            ),
            ListRow(
              title: const Text('Payments'),
              selected: true,
              onClick: _noop,
            ),
          ],
        ),
        // .lab-list-section margin-block-end: 24px between sections.
        const SizedBox(height: 24),
        const ListSection(
          label: 'About',
          children: [
            ListRow(title: Text('Version'), trailing: Text('0.10.0')),
            ListRow(title: Text('Region'), trailing: Text('Algeria')),
          ],
        ),
      ],
    ),
  ],
  'select': () => [
    grid([
      Select(
        label: 'Wilaya',
        value: 'oran',
        onValueChange: (_) {},
        children: const [
          Option(value: 'alger', child: Text('Alger')),
          Option(value: 'oran', child: Text('Oran')),
        ],
      ),
      Select(
        label: 'Courier',
        value: null,
        onValueChange: (_) {},
        children: const [Option(value: 'yalidine', child: Text('Yalidine'))],
      ),
      Select(
        label: 'Status',
        value: null,
        required: true,
        error: 'Choose an option.',
        onValueChange: (_) {},
        children: const [Option(value: 'open', child: Text('Open'))],
      ),
      Select(
        label: 'Compact',
        controlSize: .compact,
        variant: .outlined,
        value: 'a',
        onValueChange: (_) {},
        children: const [Option(value: 'a', child: Text('Small'))],
      ),
    ]),
    row([
      Select(
        ariaLabel: 'Sort',
        value: 'new',
        onValueChange: (_) {},
        children: const [Option(value: 'new', child: Text('Newest first'))],
      ),
      Select(
        ariaLabel: 'Size',
        controlSize: .compact,
        value: '20',
        onValueChange: (_) {},
        children: const [Option(value: '20', child: Text('20 per page'))],
      ),
    ]),
  ],
  'carousel': () => [
    Builder(
      builder: (context) => Carousel(
        label: 'Featured products',
        children: [
          for (final name in const ['Summer dress', 'Leather bag', 'Sneakers'])
            Container(
              height: 160,
              alignment: Alignment.center,
              color: ThemeProvider.of(context).colors.surfaceSoft,
              child: CssBaseline(
                lineHeight: 28,
                child: Text(
                  name,
                  style: const TextStyle(
                    fontSize: 20,
                    height: 28 / 20,
                    leadingDistribution: TextLeadingDistribution.even,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ),
        ],
      ),
    ),
  ],
  'tabs': () => [
    Builder(
      builder: (context) => Container(
        height: 320,
        color: ThemeProvider.of(context).colors.surfaceSoft,
        child: TabView(
          value: 'orders',
          onChange: (_) {},
          tabs: [
            Tab(
              id: 'orders',
              label: const Text('Orders'),
              icon: const LucidePackage(),
              content: const Padding(
                padding: EdgeInsets.all(24),
                child: Align(
                  alignment: AlignmentDirectional.topStart,
                  child: CssBaseline(
                    lineHeight: 22,
                    child: Text(
                      "Today's orders",
                      style: TextStyle(
                        fontSize: 15,
                        height: 22 / 15,
                        leadingDistribution: TextLeadingDistribution.even,
                      ),
                    ),
                  ),
                ),
              ),
            ),
            const Tab(
              id: 'customers',
              label: Text('Customers'),
              icon: LucideUsers(),
              content: Text('Customers'),
            ),
            const Tab(
              id: 'settings',
              label: Text('Settings'),
              icon: LucideSettings(),
              content: Text('Settings'),
            ),
          ],
        ),
      ),
    ),
  ],
  'stack': () {
    Widget body(BuildContext context) => DefaultTextStyle.merge(
      style: const TextStyle(
        fontSize: 15,
        height: 22 / 15,
        leadingDistribution: TextLeadingDistribution.even,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (final r in const [
            'Order #1040',
            'Order #1041',
            'Order #1042',
            'Order #1043',
          ])
            Container(
              padding: const EdgeInsets.symmetric(vertical: 10),
              decoration: BoxDecoration(
                border: Border(
                  bottom: BorderSide(
                    color: ThemeProvider.of(context).colors.line,
                  ),
                ),
              ),
              child: CssBaseline(lineHeight: 22, child: Text(r)),
            ),
        ],
      ),
    );
    Widget frame(List<Widget> pages) => Builder(
      builder: (context) {
        final theme = ThemeProvider.of(context);
        return Container(
          height: 360,
          decoration: ShapeDecoration(
            color: theme.colors.surface,
            shape: SuperellipseBorder(
              radius: theme.sizes.radiusPanel,
              side: BorderSide(color: theme.colors.line),
            ),
          ),
          // overflow: hidden clips to the padding box, inside the 1px border.
          child: ClipPath(
            clipper: ShapeBorderClipper(
              shape: SuperellipseBorder(radius: theme.sizes.radiusPanel - 1),
            ),
            child: NavigationStack(onBack: _noop, children: pages),
          ),
        );
      },
    );
    return [
      grid([
        frame([
          Builder(
            key: const ValueKey('orders'),
            builder: (context) =>
                NavigationPage(title: 'Orders', child: body(context)),
          ),
        ]),
        frame([
          Builder(
            key: const ValueKey('orders'),
            builder: (context) =>
                NavigationPage(title: 'Orders', child: body(context)),
          ),
          Builder(
            key: const ValueKey('o1042'),
            builder: (context) => NavigationPage(
              title: 'Order #1042',
              titleDisplay: TitleDisplay.inline,
              child: body(context),
            ),
          ),
        ]),
      ]),
    ];
  },
  'split': () => [
    Builder(
      builder: (context) {
        final theme = ThemeProvider.of(context);
        const text = TextStyle(
          fontSize: 15,
          height: 22 / 15,
          leadingDistribution: TextLeadingDistribution.even,
        );
        return Container(
          height: 360,
          decoration: ShapeDecoration(
            color: theme.colors.surface,
            shape: SuperellipseBorder(
              radius: theme.sizes.radiusPanel,
              side: BorderSide(color: theme.colors.line),
            ),
          ),
          // overflow: hidden clips to the padding box, inside the 1px border.
          child: ClipPath(
            clipper: ShapeBorderClipper(
              shape: SuperellipseBorder(radius: theme.sizes.radiusPanel - 1),
            ),
            child: SplitView(
              onBack: _noop,
              compactBreakpoint: 400,
              defaultListWidth: 300,
              list: NavigationPage(
                title: 'Orders',
                titleDisplay: TitleDisplay.inline,
                child: DefaultTextStyle.merge(
                  style: text,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      for (final r in const [
                        'Order #1040',
                        'Order #1041',
                        'Order #1042',
                      ])
                        Container(
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          decoration: BoxDecoration(
                            border: Border(
                              bottom: BorderSide(color: theme.colors.line),
                            ),
                          ),
                          child: CssBaseline(lineHeight: 22, child: Text(r)),
                        ),
                    ],
                  ),
                ),
              ),
              detail: [
                NavigationPage(
                  key: const ValueKey('o1042'),
                  title: 'Order #1042',
                  titleDisplay: TitleDisplay.inline,
                  child: CssBaseline(
                    lineHeight: 22,
                    child: Text(
                      '3 items · 4,500 DZD',
                      style: text.copyWith(color: theme.colors.muted),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    ),
  ],
  'scaffold': () => [
    Builder(
      builder: (context) {
        final theme = ThemeProvider.of(context);
        final c = theme.colors;
        return Container(
          height: 420,
          decoration: ShapeDecoration(
            color: c.ground,
            shape: SuperellipseBorder(
              radius: theme.sizes.radiusPanel,
              side: BorderSide(color: c.line),
            ),
          ),
          child: ClipPath(
            clipper: ShapeBorderClipper(
              shape: SuperellipseBorder(radius: theme.sizes.radiusPanel - 1),
            ),
            child: Scaffold(
              contentLabel: 'Orders',
              compactBreakpoint: 400,
              side: ScaffoldSide(
                leading: ConstrainedBox(
                  constraints: const BoxConstraints(minHeight: 44),
                  child: Padding(
                    padding: const EdgeInsetsDirectional.only(start: 10),
                    child: Row(
                      spacing: 8,
                      children: [
                        const Expanded(
                          child: CssBaseline(
                            lineHeight: 20,
                            child: Text(
                              'Atlas Store',
                              style: TextStyle(
                                fontSize: 15,
                                height: 20 / 15,
                                leadingDistribution:
                                    TextLeadingDistribution.even,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ),
                        const ScaffoldToggleButton(),
                      ],
                    ),
                  ),
                ),
                child: DefaultTextStyle.merge(
                  style: const TextStyle(
                    fontSize: 14,
                    height: 20 / 14,
                    leadingDistribution: TextLeadingDistribution.even,
                  ),
                  child: Column(
                    spacing: 2,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: const [
                      NavigationItem(
                        compact: false,
                        label: 'Orders',
                        icon: LucideShoppingBag(),
                        active: true,
                      ),
                      NavigationItem(
                        compact: false,
                        label: 'Products',
                        icon: LucidePackage(),
                      ),
                      NavigationItem(
                        compact: false,
                        label: 'Deliveries',
                        icon: LucideTruck(),
                      ),
                    ],
                  ),
                ),
              ),
              appBar: const ScaffoldAppBar(
                child: ToolbarGroup(
                  label: 'Current page',
                  children: [
                    Padding(
                      padding: EdgeInsets.symmetric(horizontal: 12),
                      child: CssBaseline(
                        lineHeight: 20,
                        child: Text(
                          'Orders',
                          style: TextStyle(
                            fontSize: 14,
                            height: 20 / 14,
                            leadingDistribution: TextLeadingDistribution.even,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              child: Column(
                spacing: 8,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  for (final r in const [
                    '#1048 · Amina Benali',
                    '#1047 · Yacine Haddad',
                    '#1046 · Sara Meziane',
                  ])
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 12,
                      ),
                      decoration: ShapeDecoration(
                        color: c.surface,
                        shape: SuperellipseBorder(
                          radius: theme.sizes.radiusSmall,
                          side: BorderSide(color: c.line),
                        ),
                      ),
                      child: CssBaseline(
                        lineHeight: 20,
                        child: Text(
                          r,
                          style: const TextStyle(
                            fontSize: 13,
                            height: 20 / 13,
                            leadingDistribution: TextLeadingDistribution.even,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
        );
      },
    ),
  ],
  'sheet': () => [
    Builder(
      builder: (context) => Sheet(
        open: true,
        onOpenChange: (_) {},
        label: 'Order #1042',
        detents: const [SheetDetent.medium],
        regular: SheetRegular.sheet,
        child: DefaultTextStyle.merge(
          style: const TextStyle(
            fontSize: 15,
            height: 22 / 15,
            leadingDistribution: TextLeadingDistribution.even,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Padding(
                padding: EdgeInsets.only(bottom: 8),
                child: CssBaseline(
                  lineHeight: 28,
                  child: Text(
                    'Order #1042',
                    style: TextStyle(
                      fontSize: 20,
                      height: 28 / 20,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ),
              CssBaseline(
                lineHeight: 22,
                child: Text(
                  '3 items · 4,500 DZD · Oran',
                  style: TextStyle(
                    color: ThemeProvider.of(context).colors.muted,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    ),
  ],
  'modal': () => [
    Builder(
      builder: (context) => Modal(
        label: 'Delete order',
        close: _noop,
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: DefaultTextStyle.merge(
            style: const TextStyle(
              fontSize: 15,
              height: 22 / 15,
              leadingDistribution: TextLeadingDistribution.even,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Padding(
                  padding: EdgeInsets.only(bottom: 8),
                  child: CssBaseline(
                    lineHeight: 28,
                    child: Text(
                      'Delete order #1042?',
                      style: TextStyle(
                        fontSize: 20,
                        height: 28 / 20,
                        leadingDistribution: TextLeadingDistribution.even,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.only(bottom: 20),
                  child: CssBaseline(
                    lineHeight: 22,
                    child: Text(
                      "The customer won't be notified. You can't undo this.",
                      style: TextStyle(
                        color: ThemeProvider.of(context).colors.muted,
                      ),
                    ),
                  ),
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  spacing: 12,
                  children: [
                    Button(
                      variant: .text,
                      onClick: _noop,
                      children: const [Text('Cancel')],
                    ),
                    Button(
                      variant: .destructive,
                      onClick: _noop,
                      children: const [Text('Delete')],
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    ),
  ],
  'text': () => [
    Builder(
      builder: (context) => row([
        for (final (size, line) in const [
          (12.0, 14.0),
          (14.0, 20.0),
          (15.0, 20.0),
          (16.0, 20.0),
          (16.0, 24.0),
          (13.0, 20.0),
          (17.0, 24.0),
          (18.0, 24.0),
          (20.0, 28.0),
          (24.0, 32.0),
          (11.0, 16.0),
          (10.0, 12.0),
        ])
          ColoredBox(
            color: ThemeProvider.of(context).colors.line,
            child: DefaultTextStyle.merge(
              style: TextStyle(
                fontSize: size,
                height: line / size,
                leadingDistribution: TextLeadingDistribution.even,
              ),
              child: CssBaseline(
                lineHeight: line,
                child: Text('Amina ${size.round()}/${line.round()}'),
              ),
            ),
          ),
      ]),
    ),
  ],
  'fields': () => [
    grid([
      const TextField(label: 'Customer name'),
      const TextField(label: 'Customer name', defaultValue: 'Amina Benali'),
      const TextField(
        label: 'Phone',
        leadingIcon: LucidePhone(),
        leading: Text('+213'),
        defaultValue: '555 12 34 56',
      ),
      const TextField(
        label: 'Price',
        trailing: Text('DZD'),
        defaultValue: '2500',
      ),
      const TextField(
        label: 'Email',
        defaultValue: 'amina@',
        error: 'Enter a full email address.',
      ),
      const TextField(
        label: 'Note',
        supportingText: Text('Shown to the courier.'),
        showCounter: true,
        maxLength: 80,
        defaultValue: 'Call before',
      ),
      const TextField(label: 'City', labelStyle: .inside, defaultValue: 'Oran'),
      const TextField(label: 'City', labelStyle: .inside),
      const TextField(placeholder: 'Search orders'),
      const TextField(
        label: 'Compact',
        controlSize: .compact,
        defaultValue: 'Small',
      ),
      const TextField(label: 'Tonal', variant: .tonal, defaultValue: 'Soft'),
      const TextField(
        label: 'Elevated',
        variant: .elevated,
        defaultValue: 'Raised',
      ),
      const TextField(
        label: 'Filled',
        variant: .filled,
        defaultValue: 'Strong',
      ),
      const TextField(
        label: 'Disabled',
        disabled: true,
        defaultValue: 'Locked',
      ),
    ]),
    const TextField(
      label: 'Address',
      multiline: true,
      minLines: 3,
      defaultValue: "Rue Larbi Ben M'hidi, Oran",
    ),
  ],
  'sliders': () => [
    const Slider(label: 'Volume', defaultValue: 40),
    const Slider(
      label: 'Discount',
      controlSize: .compact,
      defaultValue: 50,
      step: 25,
      showStops: true,
    ),
    Slider(
      label: 'Rating',
      trackStyle: .thin,
      min: 1,
      max: 5,
      defaultValue: 4,
      marks: [
        for (var value = 1; value <= 5; value++)
          SliderMark(value: value.toDouble(), label: Text('$value')),
      ],
    ),
    row(const [
      SlideSwitch(label: 'Notifications', defaultChecked: true),
      SlideSwitch(label: 'SMS'),
      SlideSwitch(
        label: 'Auto confirm',
        defaultChecked: true,
        onText: 'On',
        offText: 'Off',
      ),
      SlideSwitch(label: 'Auto ship', onText: 'On', offText: 'Off'),
      SlideSwitch(
        label: 'Compact',
        controlSize: .compact,
        defaultChecked: true,
      ),
      SlideSwitch(label: 'Disabled', disabled: true, defaultChecked: true),
      SlideSwitch(label: 'Thin', trackStyle: .thin, defaultChecked: true),
    ]),
  ],
  'choices': () => [
    row([
      Checkbox(
        label: const Text('Cash on delivery'),
        checked: true,
        onCheckedChange: (_) {},
      ),
      Checkbox(
        label: const Text('Stop desk'),
        checked: false,
        onCheckedChange: (_) {},
      ),
      Checkbox(
        label: const Text('Some orders'),
        checked: false,
        indeterminate: true,
        onCheckedChange: (_) {},
      ),
      Checkbox(
        label: const Text('Disabled'),
        checked: false,
        disabled: true,
        onCheckedChange: (_) {},
      ),
    ]),
    Checkbox(
      label: const Text('Product reviews'),
      description: const Text(
        'Ask delivered customers to rate what they bought.',
      ),
      checked: true,
      onCheckedChange: (_) {},
    ),
    row([
      Checkbox(
        label: const Text('Compact'),
        controlSize: .compact,
        checked: true,
        onCheckedChange: (_) {},
      ),
      Checkbox(
        label: const Text('Accept terms'),
        error: 'Accept the terms to continue.',
        checked: false,
        onCheckedChange: (_) {},
      ),
    ]),
    RadioGroup(
      label: 'Delivery speed',
      value: 'express',
      onValueChange: (_) {},
      options: const [
        RadioOption(
          value: 'standard',
          label: Text('Standard'),
          description: Text('2 to 4 days'),
        ),
        RadioOption(
          value: 'express',
          label: Text('Express'),
          description: Text('Next day'),
        ),
        RadioOption(value: 'pickup', label: Text('Pickup'), disabled: true),
      ],
    ),
    row(const [Text('Voice cloning'), ProBadge()]),
  ],
  'icons': () => [
    row([
      Button(
        variant: .filled,
        onClick: _noop,
        children: const [LucidePlus(size: 18), Text('New order')],
      ),
      Button(
        variant: .elevated,
        onClick: _noop,
        children: const [LucideDownload(size: 18), Text('Export CSV')],
      ),
      Button(
        variant: .text,
        onClick: _noop,
        children: const [Text('Continue'), LucideArrowRight(size: 18)],
      ),
    ]),
    row([
      IconButton(
        variant: .text,
        ariaLabel: 'Search',
        onClick: _noop,
        icon: const LucideSearch(),
      ),
      IconButton(
        variant: .filled,
        ariaLabel: 'Add',
        onClick: _noop,
        icon: const LucidePlus(),
      ),
      IconButton(
        variant: .elevated,
        ariaLabel: 'Delete',
        onClick: _noop,
        icon: const LucideTrash2(),
      ),
      IconButton(
        variant: .text,
        controlSize: .compact,
        ariaLabel: 'Search',
        onClick: _noop,
        icon: const LucideSearch(),
      ),
      IconButton(
        variant: .elevated,
        controlSize: .compact,
        ariaLabel: 'Delete',
        onClick: _noop,
        icon: const LucideTrash2(),
      ),
    ]),
    Builder(
      builder: (context) => IconTheme(
        data: IconThemeData(color: ThemeProvider.of(context).colors.ink),
        child: row(const [
          LucideSearch(),
          LucidePlus(),
          LucideTrash2(),
          LucideDownload(),
        ]),
      ),
    ),
  ],
  'corners': () => [
    row([
      for (final radius in [12.0, 23.0, 40.0])
        Builder(
          builder: (context) => DecoratedBox(
            decoration: ShapeDecoration(
              color: ThemeProvider.of(context).colors.ink,
              shape: SuperellipseBorder(radius: radius),
            ),
            child: const SizedBox(width: 200, height: 100),
          ),
        ),
    ]),
  ],
  'header': headerScene,
  'brand': brandScene,
  'avatar': avatarScene,
};

void _noop() {}

/// `.grid`: two equal columns, 16px rows apart, 12px columns apart.
Widget grid(List<Widget> children) => Column(
  spacing: 16,
  crossAxisAlignment: CrossAxisAlignment.stretch,
  children: [
    for (var i = 0; i < children.length; i += 2)
      Row(
        spacing: 12,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(child: children[i]),
          Expanded(
            child: i + 1 < children.length
                ? children[i + 1]
                : const SizedBox.shrink(),
          ),
        ],
      ),
  ],
);

Widget row(List<Widget> children) => Wrap(
  spacing: 12,
  runSpacing: 12,
  crossAxisAlignment: WrapCrossAlignment.center,
  children: children,
);

class _Segmented extends StatefulWidget {
  const _Segmented();
  @override
  State<_Segmented> createState() => _SegmentedState();
}

class _SegmentedState extends State<_Segmented> {
  String delivery = 'home';
  String range = 'week';

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    spacing: 24,
    children: [
      SegmentedControl<String>(
        label: 'Delivery type',
        value: delivery,
        onChange: (v) => setState(() => delivery = v),
        options: const [
          SegmentOption(value: 'home', label: 'Home delivery'),
          SegmentOption(value: 'desk', label: 'Stop desk'),
        ],
      ),
      SegmentedControl<String>(
        label: 'Summary period',
        value: range,
        onChange: (v) => setState(() => range = v),
        options: const [
          SegmentOption(value: 'today', label: 'Today'),
          SegmentOption(value: 'week', label: 'This week'),
          SegmentOption(value: 'month', label: 'This month', disabled: true),
        ],
      ),
      SegmentedControl<String>(
        label: 'View',
        appearance: .plain,
        value: 'list',
        onChange: (_) {},
        options: const [
          SegmentOption(value: 'grid', label: 'Grid'),
          SegmentOption(value: 'list', label: 'List'),
        ],
      ),
    ],
  );
}
