import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

const _stops = [
  LadderStop(
    modelId: 'imagen-fast',
    modelName: 'Imagen Fast',
    label: 'Draft',
    access: .free,
  ),
  LadderStop(
    modelId: 'imagen-standard',
    modelName: 'Imagen',
    label: 'Standard',
    access: .pro,
    priceUsd: 0.04,
  ),
  LadderStop(
    modelId: 'gpt-image-high',
    modelName: 'GPT Image',
    label: 'Studio',
    access: .pro,
    priceUsd: 0.17,
  ),
];

class Icon extends StatefulWidget {
  const Icon({super.key});

  @override
  State<Icon> createState() => _IconState();
}

class _IconState extends State<Icon> {
  int _index = 1;
  bool _generating = false;

  @override
  Widget build(BuildContext context) => Wrap(
    spacing: 12,
    runSpacing: 12,
    alignment: WrapAlignment.center,
    crossAxisAlignment: WrapCrossAlignment.center,
    children: [
      ModelLadder(
        variant: .icon,
        stops: _stops,
        index: _index,
        defaultIndex: 1,
        onChange: (index) => setState(() => _index = index),
        enabled: !_generating,
        canvas: const AspectReadout(
          size: '1024 × 1536',
          aspect: '2:3',
          widthOverHeight: 2 / 3,
        ),
        side: .bottom,
      ),
      _NativeCheckbox(
        checked: _generating,
        onChanged: (value) => setState(() => _generating = value),
        label: 'Generating',
      ),
    ],
  );
}

/// A plain `<label><input type="checkbox"> …</label>`: the browser's own 13px box, not the kit's
/// Checkbox. The whole label toggles it.
class _NativeCheckbox extends StatelessWidget {
  const _NativeCheckbox({
    required this.checked,
    required this.onChanged,
    required this.label,
  });
  final bool checked;
  final ValueChanged<bool> onChanged;
  final String label;

  @override
  Widget build(BuildContext context) {
    final dark = ThemeProvider.of(context).brightness == Brightness.dark;
    const accent = Color(0xFF0075FF);
    return Semantics(
      checked: checked,
      label: label,
      excludeSemantics: true,
      child: FocusableActionDetector(
        mouseCursor: SystemMouseCursors.basic,
        actions: {
          ActivateIntent: CallbackAction<ActivateIntent>(
            onInvoke: (_) => onChanged(!checked),
          ),
        },
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: () => onChanged(!checked),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            spacing: 8,
            children: [
              Container(
                width: 13,
                height: 13,
                margin: const EdgeInsetsDirectional.fromSTEB(4, 3, 3, 3),
                decoration: BoxDecoration(
                  color: checked
                      ? accent
                      : (dark
                            ? const Color(0xFF3B3B3B)
                            : const Color(0xFFFFFFFF)),
                  border: Border.all(
                    color: checked
                        ? accent
                        : (dark
                              ? const Color(0xFF858585)
                              : const Color(0xFF767676)),
                  ),
                  borderRadius: BorderRadius.circular(2),
                ),
                child: checked
                    ? const LucideIcon(
                        LucideIcons.check,
                        size: 11,
                        strokeWidth: 3,
                        color: Color(0xFFFFFFFF),
                      )
                    : null,
              ),
              Text(label),
            ],
          ),
        ),
      ),
    );
  }
}
