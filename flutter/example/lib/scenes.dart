import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart' hide RadioGroup;

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
  ],
  'segmented': () => [const _Segmented()],
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
};

void _noop() {}

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
