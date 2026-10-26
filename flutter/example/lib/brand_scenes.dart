import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

/// Scenes for the brand, header and avatar ports: the twins of parity/src/brand-scenes.tsx.

Widget _row(
  List<Widget> children, {
  WrapCrossAlignment align = WrapCrossAlignment.center,
}) => Wrap(
  spacing: 12,
  runSpacing: 12,
  crossAxisAlignment: align,
  children: children,
);

Widget _toggle() => const IconButton(
  variant: ButtonVariant.text,
  ariaLabel: 'Menu',
  icon: LucideMenu(),
);

List<Widget> headerScene() => [
  SizedBox(
    width: 672,
    child: Column(
      children: [
        WorkspaceHeader(
          embedded: true,
          toggle: _toggle(),
          title: 'Voice',
          detail: 'Untitled project',
          brandLabel: 'Feeef Lab',
          brandSuffix: 'lab',
          tools: const [
            IconButton(
              variant: ButtonVariant.ghost,
              appearance: ButtonAppearance.toolbar,
              ariaLabel: 'Zoom in',
              icon: LucideZoomIn(),
            ),
          ],
          actions: [
            Button(
              variant: ButtonVariant.filled,
              appearance: ButtonAppearance.toolbar,
              onClick: () {},
              children: const [Text('Share')],
            ),
          ],
        ),
        const SizedBox(height: 24),
        WorkspaceHeader(embedded: true, toggle: _toggle(), title: 'Orders'),
      ],
    ),
  ),
];

List<Widget> brandScene() => [
  Builder(
    builder: (context) => _row([
      const FoAnimatedLogo(),
      const FoAnimatedLogo(width: 100, height: 27),
      const FoAnimatedLogo(width: 60, height: 18),
      DefaultTextStyle.merge(
        style: TextStyle(color: ThemeProvider.of(context).colors.muted),
        child: const FoAnimatedLogo(width: 104, height: 26),
      ),
    ]),
  ),
  _row(const [
    FoAnimatedLogoPlayer(time: 0.9),
    FoAnimatedLogoPlayer(time: 1.6),
    FoAnimatedLogoPlayer(time: 10),
  ]),
];

List<Widget> avatarScene() => [
  _row(const [
    PixelArtwork(seed: 'voice_7f2a', size: 64),
    PixelArtwork(seed: 'voice_31c9', size: 64),
    PixelArtwork(seed: 'voice_b04e', size: 64),
    PixelArtwork(seed: 'Amina', size: 64),
    PixelArtwork(seed: 'feeef', size: 40),
  ]),
  _row(const [
    PixelArtwork(variant: PixelVariant.wave, seed: 'order-1042', size: 128),
    PixelArtwork(
      variant: PixelVariant.orbit,
      seed: 'order-1042',
      size: 72,
      tone: PixelTone.sage,
    ),
    PixelArtwork(
      variant: PixelVariant.spark,
      seed: 'order-1042',
      size: 72,
      tone: PixelTone.muted,
    ),
  ]),
  Builder(
    builder: (context) => _row([
      for (final variant in TextureVariant.values)
        Container(
          width: 200,
          height: 72,
          color: ThemeProvider.of(context).colors.ground,
          child: Stack(
            children: [
              Positioned.fill(
                child: DefaultTextStyle.merge(
                  style: TextStyle(color: ThemeProvider.of(context).colors.ink),
                  child: PixelTexture(
                    variant: variant,
                    seed: 'parity',
                    density: TextureDensity.dense,
                    opacity: 0.5,
                  ),
                ),
              ),
            ],
          ),
        ),
    ]),
  ),
  _row(align: WrapCrossAlignment.end, [
    const SizedBox(
      width: 240,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 6,
        children: [
          Label(child: Text('Phone')),
          Input(ariaLabel: 'Phone', placeholder: '0550 00 00 00'),
        ],
      ),
    ),
    SlideSwitch(label: 'SMS', checked: true, onCheckedChange: (_) {}),
    SlideSwitch(label: 'Email', checked: false, onCheckedChange: (_) {}),
  ]),
];
