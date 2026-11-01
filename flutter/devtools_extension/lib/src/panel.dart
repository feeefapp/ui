import 'package:devtools_app_shared/ui.dart';
import 'package:flutter/material.dart';

import 'controller.dart';

/// The feeef_ui tab in DevTools: theme overrides and the device's effects tier on the left, every
/// theme in the app with its resolved config, colours and sizes on the right.
class KitPanel extends StatefulWidget {
  const KitPanel({super.key});

  @override
  State<KitPanel> createState() => _KitPanelState();
}

class _KitPanelState extends State<KitPanel> {
  final controller = KitController();

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: controller,
      builder: (context, _) {
        final state = controller.state;
        if (!controller.available || state == null) {
          return _Empty(controller: controller);
        }
        final side = ListView(
          padding: const EdgeInsets.all(defaultSpacing),
          children: [
            _Overrides(controller: controller, state: state),
            const SizedBox(height: defaultSpacing),
            _Device(controller: controller, state: state),
          ],
        );
        final themes = _Themes(themes: _list(state['themes']));
        return LayoutBuilder(
          builder: (context, constraints) {
            final header = _Header(controller: controller);
            if (constraints.maxWidth < 900) {
              return Column(
                children: [
                  header,
                  Expanded(
                    child: DefaultTabController(
                      length: 2,
                      child: Column(
                        children: [
                          const TabBar(
                            tabs: [
                              Tab(text: 'Overrides'),
                              Tab(text: 'Themes'),
                            ],
                          ),
                          Expanded(child: TabBarView(children: [side, themes])),
                        ],
                      ),
                    ),
                  ),
                ],
              );
            }
            return Column(
              children: [
                header,
                Expanded(
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      SizedBox(width: 380, child: side),
                      const VerticalDivider(width: 1),
                      Expanded(child: themes),
                    ],
                  ),
                ),
              ],
            );
          },
        );
      },
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.controller});
  final KitController controller;

  @override
  Widget build(BuildContext context) {
    final error = controller.error;
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        defaultSpacing,
        denseSpacing,
        denseSpacing,
        denseSpacing,
      ),
      child: Row(
        children: [
          Text('feeef_ui', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(width: defaultSpacing),
          if (error != null)
            Expanded(
              child: Text(
                error,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
                overflow: TextOverflow.ellipsis,
              ),
            )
          else
            const Spacer(),
          if (controller.loading)
            const SizedBox.square(
              dimension: 16,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
          IconButton(
            tooltip: 'Refresh',
            icon: const Icon(Icons.refresh),
            onPressed: controller.refresh,
          ),
        ],
      ),
    );
  }
}

class _Empty extends StatelessWidget {
  const _Empty({required this.controller});
  final KitController controller;

  @override
  Widget build(BuildContext context) {
    final error = controller.error;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(defaultSpacing),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              controller.available
                  ? 'Reading the kit…'
                  : 'No feeef_ui ThemeProvider has built in this app yet.',
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: denseSpacing),
            Text(
              error ??
                  'The kit registers its DevTools hooks (ext.feeef_ui.*) when the first '
                      'ThemeProvider builds, in debug and profile builds.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: defaultSpacing),
            OutlinedButton(
              onPressed: controller.refresh,
              child: const Text('Try again'),
            ),
          ],
        ),
      ),
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.children, this.action});
  final String title;
  final Widget? action;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(defaultSpacing),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    title,
                    style: Theme.of(context).textTheme.titleSmall,
                  ),
                ),
                ?action,
              ],
            ),
            const SizedBox(height: denseSpacing),
            ...children,
          ],
        ),
      ),
    );
  }
}

/// One option: "App" keeps each provider's own value, the rest force it everywhere.
class _Choice extends StatelessWidget {
  const _Choice({
    required this.label,
    required this.options,
    required this.value,
    required this.onChanged,
  });

  final String label;
  final List<String> options;
  final String? value;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: denseSpacing),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: Theme.of(context).textTheme.labelMedium),
          const SizedBox(height: 4),
          Wrap(
            spacing: 4,
            runSpacing: 4,
            children: [
              for (final (choice, text) in [
                ('', 'App'),
                for (final option in options) (option, option),
              ])
                ChoiceChip(
                  label: Text(text),
                  visualDensity: VisualDensity.compact,
                  materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  showCheckmark: false,
                  selected: (value ?? '') == choice,
                  onSelected: (_) => onChanged(choice),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Overrides extends StatefulWidget {
  const _Overrides({required this.controller, required this.state});
  final KitController controller;
  final Map<String, Object?> state;

  @override
  State<_Overrides> createState() => _OverridesState();
}

class _OverridesState extends State<_Overrides> {
  final primary = TextEditingController();
  final radius = ValueNotifier<double?>(null);
  final tint = ValueNotifier<double?>(null);

  Map<String, Object?> get current => _map(widget.state['override']);

  @override
  void didUpdateWidget(_Overrides old) {
    super.didUpdateWidget(old);
    radius.value = null;
    tint.value = null;
  }

  @override
  void dispose() {
    primary.dispose();
    radius.dispose();
    tint.dispose();
    super.dispose();
  }

  void set(String key, Object? value) =>
      widget.controller.setOverride({key: value == null ? '' : '$value'});

  Widget slider(
    String key,
    String label,
    ValueNotifier<double?> dragging,
    double max,
  ) {
    final forced = (current[key] as num?)?.toDouble();
    return ValueListenableBuilder<double?>(
      valueListenable: dragging,
      builder: (context, drag, _) {
        final value = drag ?? forced;
        return Row(
          children: [
            SizedBox(
              width: 72,
              child: Text(
                label,
                style: Theme.of(context).textTheme.labelMedium,
              ),
            ),
            Expanded(
              child: Slider(
                value: (value ?? 1).clamp(0, max),
                max: max,
                divisions: (max * 20).round(),
                onChanged: (v) => dragging.value = v,
                onChangeEnd: (v) => set(key, v),
              ),
            ),
            SizedBox(
              width: 40,
              child: Text(value == null ? 'app' : value.toStringAsFixed(2)),
            ),
            IconButton(
              tooltip: 'Use the app\'s',
              icon: const Icon(Icons.undo, size: 16),
              onPressed: forced == null ? null : () => set(key, null),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final forced = current;
    String? pick(String key) => forced[key] as String?;
    String? flag(String key) => switch (forced[key]) {
      true => 'on',
      false => 'off',
      _ => null,
    };
    final colour = _parseColour(forced['primary'] as String?);
    return _Section(
      title: 'Overrides',
      action: TextButton(
        onPressed: forced.isEmpty
            ? null
            : () => widget.controller.setOverride({}, clear: true),
        child: const Text('Clear all'),
      ),
      children: [
        Text(
          'Applied by every ThemeProvider at once. Nested providers with their own brightness '
          'keep it.',
          style: Theme.of(context).textTheme.bodySmall,
        ),
        const SizedBox(height: denseSpacing),
        _Choice(
          label: 'Brightness',
          options: const ['light', 'dark'],
          value: pick('brightness'),
          onChanged: (v) => set('brightness', v),
        ),
        _Choice(
          label: 'Palette',
          options: const ['lab', 'mono'],
          value: pick('palette'),
          onChanged: (v) => set('palette', v),
        ),
        _Choice(
          label: 'Density',
          options: const ['comfortable', 'compact', 'thin'],
          value: pick('density'),
          onChanged: (v) => set('density', v),
        ),
        _Choice(
          label: 'Glass',
          options: const ['liquid', 'transparent', 'solid'],
          value: pick('glass'),
          onChanged: (v) => set('glass', v),
        ),
        _Choice(
          label: 'Glass blur',
          options: const ['on', 'off'],
          value: flag('glassBlur'),
          onChanged: (v) => set('glassBlur', v.isEmpty ? null : v == 'on'),
        ),
        _Choice(
          label: 'Glass refraction',
          options: const ['on', 'off'],
          value: flag('glassRefraction'),
          onChanged: (v) =>
              set('glassRefraction', v.isEmpty ? null : v == 'on'),
        ),
        _Choice(
          label: 'Motion',
          options: const ['full', 'reduced', 'none'],
          value: pick('motion'),
          onChanged: (v) => set('motion', v),
        ),
        _Choice(
          label: 'Performance',
          options: const ['auto', 'full', 'balanced', 'light'],
          value: pick('performance'),
          onChanged: (v) => set('performance', v),
        ),
        slider('radius', 'Radius', radius, 1.5),
        slider('glassTint', 'Glass tint', tint, 1),
        Row(
          children: [
            Container(
              width: 20,
              height: 20,
              decoration: BoxDecoration(
                color: colour,
                border: Border.all(color: Theme.of(context).dividerColor),
                borderRadius: BorderRadius.circular(4),
              ),
            ),
            const SizedBox(width: denseSpacing),
            Expanded(
              child: TextField(
                controller: primary,
                decoration: InputDecoration(
                  isDense: true,
                  labelText: 'Primary',
                  hintText: (forced['primary'] as String?) ?? '#rrggbb',
                ),
                onSubmitted: (v) {
                  set('primary', v.trim().isEmpty ? null : v.trim());
                  primary.clear();
                },
              ),
            ),
            IconButton(
              tooltip: 'Use the app\'s',
              icon: const Icon(Icons.undo, size: 16),
              onPressed: forced['primary'] == null
                  ? null
                  : () => set('primary', null),
            ),
          ],
        ),
      ],
    );
  }
}

class _Device extends StatelessWidget {
  const _Device({required this.controller, required this.state});
  final KitController controller;
  final Map<String, Object?> state;

  @override
  Widget build(BuildContext context) {
    final device = _map(state['device']);
    final capabilities = _map(state['capabilities']);
    final slow = state['measuredSlow'] == true;
    return _Section(
      title: 'Device and effects',
      children: [
        _Row('Auto tier', '${state['autoTier']}'),
        _Row('Measured slow', slow ? 'yes (auto steps down to light)' : 'no'),
        _Row('Web', '${device['web']}'),
        _Row('Cores', '${device['cores'] ?? 'unknown'}'),
        _Row(
          'Memory',
          device['memoryGb'] == null ? 'unknown' : '${device['memoryGb']} GB',
        ),
        _Row('Renderer thread', '${device['threaded']}'),
        _Row('Software GPU', '${device['softwareGpu']}'),
        _Row(
          'Refraction',
          capabilities['refraction'] == true
              ? 'Impeller shader'
              : 'unsupported',
        ),
        const SizedBox(height: denseSpacing),
        Align(
          alignment: AlignmentDirectional.centerStart,
          child: OutlinedButton(
            onPressed: () => controller.setMeasuredSlow(!slow),
            child: Text(
              slow ? 'Forget measured slow' : 'Simulate a slow device',
            ),
          ),
        ),
      ],
    );
  }
}

class _Themes extends StatelessWidget {
  const _Themes({required this.themes});
  final List<Map<String, Object?>> themes;

  @override
  Widget build(BuildContext context) {
    if (themes.isEmpty) {
      return const Center(child: Text('No theme is mounted.'));
    }
    return ListView.separated(
      padding: const EdgeInsets.all(defaultSpacing),
      itemCount: themes.length,
      separatorBuilder: (_, _) => const SizedBox(height: defaultSpacing),
      itemBuilder: (context, i) => _ThemeCard(theme: themes[i], index: i),
    );
  }
}

class _ThemeCard extends StatelessWidget {
  const _ThemeCard({required this.theme, required this.index});
  final Map<String, Object?> theme;
  final int index;

  @override
  Widget build(BuildContext context) {
    final depth = theme['depth'] as int? ?? 0;
    final chain = (theme['creator'] as String? ?? '')
        .split('←')
        .map((part) => part.trim())
        .toList();
    final provider = chain.indexOf('ThemeProvider');
    final creator = provider < 0
        ? ''
        : chain.skip(provider).take(3).join(' ← ');
    return Card(
      margin: EdgeInsetsDirectional.only(start: depth * 24.0),
      child: ExpansionTile(
        initiallyExpanded: index == 0,
        title: Text(
          '${depth == 0 ? 'Root theme' : 'Nested theme'} · ${theme['brightness']} · '
          '${theme['performance']} tier',
        ),
        subtitle: creator.isEmpty
            ? null
            : Text(creator, overflow: TextOverflow.ellipsis),
        childrenPadding: const EdgeInsets.fromLTRB(
          defaultSpacing,
          0,
          defaultSpacing,
          defaultSpacing,
        ),
        children: [
          DefaultTabController(
            length: 3,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const TabBar(
                  tabs: [
                    Tab(text: 'Config'),
                    Tab(text: 'Colours'),
                    Tab(text: 'Sizes'),
                  ],
                ),
                SizedBox(
                  height: 360,
                  child: TabBarView(
                    children: [
                      _Properties(values: _map(theme['config'])),
                      _Colours(values: _map(theme['colors'])),
                      _Properties(values: _map(theme['sizes'])),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Properties extends StatelessWidget {
  const _Properties({required this.values});
  final Map<String, Object?> values;

  @override
  Widget build(BuildContext context) {
    final defaults = {...?(values['defaults'] as List?)?.cast<String>()};
    final entries = values.entries.where((e) => e.key != 'defaults').toList();
    final muted = Theme.of(context).disabledColor;
    return ListView(
      padding: const EdgeInsets.only(top: denseSpacing),
      children: [
        for (final MapEntry(:key, :value) in entries)
          _Row(key, switch (value) {
            null => '—',
            Map(isEmpty: true) => 'none',
            Map() => [
              for (final MapEntry(:key, :value) in value.entries)
                '$key: $value',
            ].join(', '),
            _ => '$value',
          }, color: defaults.contains(key) ? muted : null),
      ],
    );
  }
}

class _Colours extends StatelessWidget {
  const _Colours({required this.values});
  final Map<String, Object?> values;

  @override
  Widget build(BuildContext context) {
    final colours = [
      for (final MapEntry(:key, :value) in values.entries)
        if (value is String && _parseColour(value) != null)
          (key, value, _parseColour(value)!),
    ];
    return GridView.extent(
      padding: const EdgeInsets.only(top: denseSpacing),
      maxCrossAxisExtent: 180,
      childAspectRatio: 3.2,
      mainAxisSpacing: denseSpacing,
      crossAxisSpacing: denseSpacing,
      children: [
        for (final (name, hex, colour) in colours)
          Tooltip(
            message: hex,
            child: Row(
              children: [
                Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                    color: colour,
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: Theme.of(context).dividerColor),
                  ),
                ),
                const SizedBox(width: denseSpacing),
                Expanded(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(name, overflow: TextOverflow.ellipsis),
                      SelectableText(
                        hex,
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

class _Row extends StatelessWidget {
  const _Row(this.label, this.value, {this.color});
  final String label;
  final String value;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final style = Theme.of(context).textTheme.bodyMedium
        ?.copyWith(color: color);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 150, child: Text(label, style: style)),
          Expanded(child: SelectableText(value, style: style)),
        ],
      ),
    );
  }
}

Map<String, Object?> _map(Object? value) =>
    value is Map ? value.cast<String, Object?>() : const {};

List<Map<String, Object?>> _list(Object? value) => [
  if (value is List)
    for (final item in value) _map(item),
];

/// `#rrggbb` or `#rrggbbaa`.
Color? _parseColour(String? hex) {
  if (hex == null || !hex.startsWith('#')) return null;
  final digits = hex.substring(1);
  final value = int.tryParse(digits, radix: 16);
  if (value == null) return null;
  return switch (digits.length) {
    6 => Color(0xff000000 | value),
    8 => Color(((value & 0xff) << 24) | (value >> 8)),
    _ => null,
  };
}
