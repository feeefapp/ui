import 'dart:convert' show jsonEncode;
import 'dart:math' as math;

import 'package:flutter/widgets.dart';

import '../theme.dart';
import 'pixel_noise.dart';
import 'pixel_texture.dart';

export 'pixel_noise.dart' show TextureVariant, TextureDensity;

/// Ink of a pixel graphic (`lab-pixel-tone-*`).
enum PixelTone { ink, sage, inverse, muted }

/// Motif of a [PixelArtwork].
enum PixelVariant { voice, wave, orbit, spark }

/// One square of artwork: position in the view box, opacity, and an own colour (voice only).
typedef ArtworkPixel = ({double x, double y, double opacity, Color? color});

/// The squares of a [PixelArtwork] and its view box.
typedef Artwork = ({List<ArtworkPixel> pixels, double width, double height});

/// The colour of [tone] in the current theme (`--lab-ink`, `--lab-pixel-sage`, white,
/// `--lab-pixel-muted`).
Color pixelToneColor(BuildContext context, PixelTone tone) {
  final theme = ThemeProvider.of(context);
  final mono = theme.config.palette == Palette.mono;
  final dark = theme.brightness == Brightness.dark;
  return switch (tone) {
    PixelTone.ink => theme.colors.ink,
    PixelTone.inverse => const Color(0xFFFFFFFF),
    PixelTone.sage => Color(
      !mono
          ? 0xFF647B5C
          : dark
          ? 0xFF8A8A8A
          : 0xFF6B6B6B,
    ),
    PixelTone.muted => Color(
      !mono
          ? 0xFF9DA995
          : dark
          ? 0xFF5C5C5C
          : 0xFFA3A3A3,
    ),
  };
}

const _bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

int _hash(String value, int salt) {
  var state = (2166136261 ^ (salt & 0xFFFFFFFF)) & 0xFFFFFFFF;
  for (final rune in value.runes) {
    state = imul32(state ^ rune, 16777619);
  }
  state = (state ^ (state >> 16)) & 0xFFFFFFFF;
  return imul32(state, 2246822507);
}

/// CSS `hsl(h s% l%)` → colour.
Color _hsl(num hue, double saturation, double lightness) =>
    HSLColor.fromAHSL(1, hue.toDouble(), saturation, lightness).toColor();

/// The seeded multicolour fingerprint of `avatar-fingerprint.ts` `voiceFingerprint(seed)`.
Artwork voiceFingerprint(String seed, [int rotationSalt = 0]) {
  // avatarKey(string) = JSON.stringify(string).
  final source = '${jsonEncode(seed)}:$rotationSalt';
  final hashes = [
    for (var salt = 0; salt < 4; salt++) _hash(source, salt * 2654435761),
  ];
  final rotation = (hashes[1] / 4294967296) * math.pi * 2;
  final hue = hashes[0] % 360;
  final colors = [
    _hsl(hue, 0.38, 0.91),
    _hsl(hue, 0.54, 0.72),
    _hsl(hue, 0.58, 0.54),
    _hsl((hue + 28) % 360, 0.52, 0.36),
    _hsl((hue + 42) % 360, 0.46, 0.24),
  ];
  final frequency = 2 + (hashes[2] % 3);
  final pixels = <ArtworkPixel>[];
  for (var row = 0; row < 16; row++) {
    for (var column = 0; column < 16; column++) {
      final x = (column - 7.5) / 7.5, y = (row - 7.5) / 7.5;
      final radius = math.sqrt(x * x + y * y);
      final angle = math.atan2(y, x) + rotation;
      final edge = 0.91 + 0.05 * math.sin(angle * 3 + hashes[3] / 1000);
      if (radius > edge) continue;
      final z = math.sqrt(math.max(0, 1 - radius * radius));
      final rotatedX = x * math.cos(rotation) - y * math.sin(rotation);
      final rotatedY = x * math.sin(rotation) + y * math.cos(rotation);
      final light = (z * 0.72 - x * 0.36 - y * 0.42).clamp(0.0, 1.0);
      final ribbon = math.sin(
        rotatedX * frequency * 2.2 + rotatedY * 2.1 + z * 2.4,
      );
      final shade = (light * 0.68 + (ribbon + 1) * 0.16).clamp(0.0, 1.0);
      final dither = _bayer[(row % 4) * 4 + (column % 4)] / 16;
      final index = ((1 - shade) * 4 + dither * 0.65).floor().clamp(1, 4);
      pixels.add((
        x: column * 4.0,
        y: row * 4.0,
        opacity: 1,
        color: colors[index],
      ));
    }
  }
  return (pixels: pixels, width: 64, height: 64);
}

/// The squares of `pixel-art.tsx` `artworkPixels(variant, seed)`.
Artwork artworkPixels(PixelVariant variant, String seed) {
  if (variant == PixelVariant.voice) return voiceFingerprint(seed);
  final random = randomSequence(seed);
  final phase = random() * math.pi * 2;
  final columns = variant == PixelVariant.wave ? 32 : 24;
  final rows = variant == PixelVariant.wave ? 16 : 24;
  final pixels = <ArtworkPixel>[];
  for (var row = 0; row < rows; row++) {
    for (var column = 0; column < columns; column++) {
      final x = ((column + 0.5) / columns) * 2 - 1;
      final y = ((row + 0.5) / rows) * 2 - 1;
      final radius = math.sqrt(x * x + y * y);
      final angle = math.atan2(y, x);
      double strength;
      switch (variant) {
        case PixelVariant.wave:
          final crest = math.sin(x * math.pi * 2.3 + phase) * 0.22;
          final envelope = math.pow(math.max(0, 1 - x * x), 0.6);
          final s = math.sin(x * 11 + phase);
          final amplitude = 0.12 + 0.46 * envelope * (0.55 + 0.45 * s * s);
          strength = math.max(0, 1 - (y - crest).abs() / amplitude);
          strength *= 0.72 + 0.28 * math.cos(column * math.pi);
        case PixelVariant.orbit:
          final ring = math.max(0.0, 1 - (radius - 0.62).abs() / 0.17);
          final diagonal = math.max(0.0, 1 - (y + x * 0.47).abs() / 0.13);
          final dx = x - 0.16, dy = y + 0.03;
          final core = math.max(0.0, 1 - math.sqrt(dx * dx + dy * dy) / 0.2);
          final s = math.sin(angle + phase);
          strength = math.max(
            math.max(ring * (0.55 + 0.45 * s * s), diagonal * 0.67),
            core,
          );
          if (radius > 0.92) strength = 0;
        case PixelVariant.spark:
        case PixelVariant.voice:
          final cross = math.max(0.0, 1 - math.min(x.abs(), y.abs()) / 0.13);
          final diagonal = math.max(
            0.0,
            1 - math.min((x + y).abs(), (x - y).abs()) / 0.095,
          );
          final taper = math.max(0.0, 1 - radius / 0.86);
          strength = math.max(cross * taper * 1.45, diagonal * taper * 0.7);
      }
      final threshold = (_bayer[(row % 4) * 4 + (column % 4)] + 0.5) / 16;
      if (strength > threshold * 0.81 + 0.055) {
        pixels.add((
          x: column * 4.0,
          y: row * 4.0,
          opacity: strength > 0.72
              ? 1
              : strength > 0.44
              ? 0.7
              : 0.35,
          color: null,
        ));
      }
    }
  }
  return (pixels: pixels, width: columns * 4.0, height: rows * 4.0);
}

final _artCache = <(PixelVariant, String), Artwork>{};

/// Seeded pixel artwork for identity (avatars, empty states, cards): the twin of `PixelArtwork`
/// in `@feeef.dev/ui/pixel-art`. Decorative unless [title] is set.
class PixelArtwork extends StatefulWidget {
  const PixelArtwork({
    super.key,
    this.variant = PixelVariant.voice,
    this.seed = 'feeef',
    this.size = 48,
    this.tone = PixelTone.ink,
    this.animated = false,
    this.title,
  });

  /// Motif: `voice` (multicolour fingerprint), `wave` (2:1 band), `orbit` (ring), `spark` (star).
  final PixelVariant variant;

  /// Stable string that picks the arrangement; the same seed always draws the same art.
  final String seed;

  /// Width in pixels. Height follows the motif's aspect ratio.
  final double size;

  /// Ink for `wave`, `orbit` and `spark`. `voice` uses its own seeded palette.
  final PixelTone tone;

  /// Adds a slow breathing animation. Stays still under reduced motion.
  final bool animated;

  /// Accessible name. Omit for decoration.
  final String? title;

  @override
  State<PixelArtwork> createState() => _PixelArtworkState();
}

class _PixelArtworkState extends State<PixelArtwork>
    with SingleTickerProviderStateMixin {
  // `lab-pixel-breathe`: 3.6s ease-in-out, opacity 0.85 → 1 → 0.85.
  late final _breath = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 3600),
  );

  void _sync() {
    final still = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
    if (widget.animated && !still) {
      if (!_breath.isAnimating) _breath.repeat();
    } else {
      _breath.stop();
      _breath.value = 0;
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _sync();
  }

  @override
  void didUpdateWidget(PixelArtwork old) {
    super.didUpdateWidget(old);
    _sync();
  }

  @override
  void dispose() {
    _breath.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final art = _artCache.putIfAbsent((
      widget.variant,
      widget.seed,
    ), () => artworkPixels(widget.variant, widget.seed));
    final color = pixelToneColor(context, widget.tone);
    final animated = widget.animated && _breath.isAnimating;
    Widget paint = CustomPaint(
      size: Size(widget.size, widget.size * art.height / art.width),
      painter: _ArtworkPainter(art: art, color: color),
    );
    if (animated) {
      paint = FadeTransition(
        opacity: _breath.drive(
          TweenSequence([
            TweenSequenceItem(
              tween: Tween(
                begin: 0.85,
                end: 1.0,
              ).chain(CurveTween(curve: Curves.easeInOut)),
              weight: 1,
            ),
            TweenSequenceItem(
              tween: Tween(
                begin: 1.0,
                end: 0.85,
              ).chain(CurveTween(curve: Curves.easeInOut)),
              weight: 1,
            ),
          ]),
        ),
        child: paint,
      );
    }
    paint = IgnorePointer(child: paint);
    if (widget.title == null) return ExcludeSemantics(child: paint);
    return Semantics(image: true, label: widget.title, child: paint);
  }
}

class _ArtworkPainter extends CustomPainter {
  _ArtworkPainter({required this.art, required this.color});
  final Artwork art;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    // `shape-rendering: crispEdges`: 3-unit squares, unblended at their edges.
    final scale = size.width / art.width;
    final paint = Paint()..isAntiAlias = false;
    for (final pixel in art.pixels) {
      final ink = pixel.color ?? color;
      paint.color = ink.withValues(alpha: ink.a * pixel.opacity);
      canvas.drawRect(
        Rect.fromLTWH(pixel.x * scale, pixel.y * scale, 3 * scale, 3 * scale),
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(_ArtworkPainter old) =>
      old.art != art || old.color != color;
}

/// Decorative pixel paint for a surface: the twin of `PixelTexture` in
/// `@feeef.dev/ui/pixel-art`. It fills its parent (put it in a `Positioned.fill`, clipped to the
/// surface), ignores the pointer, and inherits the text colour unless [tone] is set.
class PixelTexture extends StatefulWidget {
  const PixelTexture({
    super.key,
    this.variant = TextureVariant.corner,
    this.seed = 'feeef-surface',
    this.density = TextureDensity.medium,
    this.tone,
    this.animated = false,
    this.opacity = 0.13,
  });

  /// Where pixels gather: `corner` toward the top end, `grain` across the field, `wave` on a band.
  final TextureVariant variant;

  /// Stable string that picks the arrangement, such as a record id.
  final String seed;

  /// How many squares are drawn.
  final TextureDensity density;

  /// Ink colour. Omit it to inherit the surface's text colour.
  final PixelTone? tone;

  /// Adds a slow opacity pulse. Stays still under reduced motion.
  final bool animated;

  /// Overall opacity (the web kit's `--pixel-texture-opacity`).
  final double opacity;

  @override
  State<PixelTexture> createState() => _PixelTextureState();
}

class _PixelTextureState extends State<PixelTexture>
    with SingleTickerProviderStateMixin {
  // `lab-pixel-texture-breathe`: 2.8s ease-in-out, opacity down to 55% and back.
  late final _breath = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 2800),
  );

  void _sync() {
    final still = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
    if (widget.animated && !still) {
      if (!_breath.isAnimating) _breath.repeat();
    } else {
      _breath.stop();
      _breath.value = 0;
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _sync();
  }

  @override
  void didUpdateWidget(PixelTexture old) {
    super.didUpdateWidget(old);
    _sync();
  }

  @override
  void dispose() {
    _breath.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final tone = widget.tone;
    final color = tone == null
        ? DefaultTextStyle.of(context).style.color ??
              ThemeProvider.of(context).colors.ink
        : pixelToneColor(context, tone);
    // Like the web SVG it paints physically: `corner` gathers to the right in RTL too.
    return ExcludeSemantics(
      child: IgnorePointer(
        child: SizedBox.expand(
          child: CustomPaint(
            painter: _TexturePainter(
              breath: _breath,
              color: color,
              opacity: widget.opacity,
              variant: widget.variant,
              seed: widget.seed,
              density: widget.density,
            ),
          ),
        ),
      ),
    );
  }
}

class _TexturePainter extends CustomPainter {
  _TexturePainter({
    required this.breath,
    required this.color,
    required this.opacity,
    required this.variant,
    required this.seed,
    required this.density,
  }) : super(repaint: breath);
  final Animation<double> breath;
  final Color color;
  final double opacity;
  final TextureVariant variant;
  final String seed;
  final TextureDensity density;

  @override
  void paint(Canvas canvas, Size size) {
    final t = breath.value;
    final wave = Curves.easeInOut.transform(t < 0.5 ? t * 2 : (1 - t) * 2);
    paintPixelTexture(
      canvas,
      Offset.zero & size,
      color: color,
      opacity: opacity * (1 - 0.45 * wave),
      variant: variant,
      seed: seed,
      density: density,
    );
  }

  @override
  bool shouldRepaint(_TexturePainter old) =>
      old.color != color ||
      old.opacity != opacity ||
      old.variant != variant ||
      old.seed != seed ||
      old.density != density;
}
