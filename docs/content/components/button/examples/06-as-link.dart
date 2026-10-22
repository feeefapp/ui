import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

class AsLink extends StatelessWidget {
  const AsLink({super.key, this.open});

  /// Your router or url_launcher call. The button announces itself as a link either way.
  final ValueChanged<Uri>? open;

  @override
  Widget build(BuildContext context) => Wrap(
    spacing: 12,
    runSpacing: 12,
    alignment: WrapAlignment.center,
    children: [
      Semantics(
        link: true,
        linkUrl: Uri.parse('#as-link'),
        child: Button(
          variant: .filled,
          onClick: () => open?.call(Uri.parse('#as-link')),
          children: const [Text('Open dashboard')],
        ),
      ),
      Semantics(
        link: true,
        linkUrl: Uri.parse('https://feeef.org'),
        child: Button(
          variant: .text,
          onClick: () => open?.call(Uri.parse('https://feeef.org')),
          children: const [Text('feeef.org'), LucideIcon(LucideIcons.externalLink)],
        ),
      ),
    ],
  );
}
