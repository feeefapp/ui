import 'dart:ui' show SemanticsRole;

import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

const _columns = ['Customer', 'Phone', 'Wilaya', 'Courier', 'Total'];

class MenuIndicator extends StatefulWidget {
  const MenuIndicator({super.key});

  @override
  State<MenuIndicator> createState() => _MenuIndicatorState();
}

class _MenuIndicatorState extends State<MenuIndicator> {
  List<String> visible = ['Customer', 'Wilaya', 'Total'];

  void _toggle(String column) => setState(
    () => visible = visible.contains(column)
        ? visible.where((c) => c != column).toList()
        : [...visible, column],
  );

  @override
  Widget build(BuildContext context) => Semantics(
    container: true,
    role: SemanticsRole.menu,
    label: 'Visible columns',
    child: Container(
      width: 240,
      padding: const EdgeInsets.all(6),
      decoration: BoxDecoration(
        border: Border.all(color: ThemeProvider.of(context).colors.line),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 2,
        children: [
          for (final column in _columns)
            _MenuItem(
              key: ValueKey(column),
              label: column,
              checked: visible.contains(column),
              onTap: () => _toggle(column),
            ),
        ],
      ),
    ),
  );
}

/// A plain `<button role="menuitemcheckbox">`: 8/10 padding, 10px radius, no surface.
class _MenuItem extends StatelessWidget {
  const _MenuItem({
    super.key,
    required this.label,
    required this.checked,
    required this.onTap,
  });
  final String label;
  final bool checked;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Semantics(
    role: SemanticsRole.menuItemCheckbox,
    checked: checked,
    label: label,
    child: FocusableActionDetector(
      mouseCursor: SystemMouseCursors.click,
      actions: {
        ActivateIntent: CallbackAction<ActivateIntent>(
          onInvoke: (_) => onTap(),
        ),
      },
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 10),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              ExcludeSemantics(child: Text(label)),
              SlideSwitchIndicator(checked: checked),
            ],
          ),
        ),
      ),
    ),
  );
}
