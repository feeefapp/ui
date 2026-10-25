import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

const _labels = {'list': 'List', 'board': 'Board', 'grid': 'Grid'};

class FoldIntoMenu extends StatefulWidget {
  const FoldIntoMenu({super.key});

  @override
  State<FoldIntoMenu> createState() => _FoldIntoMenuState();
}

class _FoldIntoMenuState extends State<FoldIntoMenu> {
  double _width = 280;
  String _view = 'board';

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 560,
    child: Column(
      spacing: 16,
      children: [
        Slider(
          label: 'Bar width',
          min: 200,
          max: 560,
          value: _width,
          onValueChange: (value) => setState(() => _width = value),
        ),
        SizedBox(
          width: _width,
          child: GlassScope(
            child: Row(
              spacing: 8,
              children: [
                // The control folds by the width it is given: Flexible in a Row.
                Flexible(
                  child: ToolbarGroup(
                    label: 'Orders view',
                    children: [
                      Flexible(
                        child: SegmentedControl<String>(
                          label: 'Orders view',
                          value: _view,
                          onChange: (value) => setState(() => _view = value),
                          options: const [
                            SegmentOption(
                              value: 'list',
                              label: 'List',
                              icon: LucideIcon(LucideIcons.list),
                            ),
                            SegmentOption(
                              value: 'board',
                              label: 'Board',
                              icon: LucideIcon(LucideIcons.columns3),
                            ),
                            SegmentOption(
                              value: 'grid',
                              label: 'Grid',
                              icon: LucideIcon(LucideIcons.layoutGrid),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                ToolbarGroup(
                  label: 'Tools',
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
              ],
            ),
          ),
        ),
        Text('Showing orders as ${_labels[_view]}'),
      ],
    ),
  );
}
