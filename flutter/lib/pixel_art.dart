/// Seeded pixel artwork, textures, loader and shader: the twin of `@feeef.dev/ui/pixel-art`.
/// `PixelLoader` and `PixelShader` live in `brand/` and are re-exported here, so this import
/// gives the same four widgets as the web module.
library;

import 'dart:math' as math;

import 'package:flutter/widgets.dart';

import 'avatar_fingerprint.dart';
import 'brand/pixel_noise.dart';
import 'brand/pixel_texture.dart';
import 'theme.dart';

export 'brand/pixel_loader.dart';
export 'brand/pixel_noise.dart' show TextureDensity, TextureVariant;
export 'brand/pixel_shader.dart';

/// Ink of a pixel graphic: the text ink, the sage or muted pixel tones, or white.
enum PixelTone { ink, sage, inverse, muted }

/// Motif of a [PixelArtwork].
enum PixelVariant { voice, wave, orbit, spark }

/// One square of an artwork: position in its view box, opacity and, for `voice`, its own colour.
typedef ArtworkPixel = ({double x, double y, double opacity, Color? color});

/// Squares and view box of an artwork.
typedef Artwork = ({List<ArtworkPixel> pixels, int width, int height});

const _bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/// The squares of a [PixelArtwork] for a seed (`artworkPixels` in `pixel-art.tsx`): `voice` is the
/// [voiceFingerprint] of the seed (64 × 64); `wave` is 32 × 16 cells, `orbit` and `spark` 24 × 24,
/// each a 3px square on a 4px grid, kept by ordered 4 × 4 dithering.
Artwork artworkPixels(PixelVariant variant, String seed) {
  if (variant == PixelVariant.voice) {
    final print = voiceFingerprint(seed);
    final palette = print.palette;
    return (
      pixels: [
        for (final p in print.pixels)
          (
            x: p.x,
            y: p.y,
            opacity: p.opacity,
            color: palette[print.colors.indexOf(p.color)],
          ),
      ],
      width: 64,
      height: 64,
    );
  }
  final random = randomSequence(seed);
  final phase = random() * math.pi * 2;
  final columns = variant == PixelVariant.wave ? 32 : 24;
  final rows = variant == PixelVariant.wave ? 16 : 24;
  final pixels = <ArtworkPixel>[];
  for (var row = 0; row < rows; row++) {
    for (var column = 0; column < columns; column++) {
      final x = ((column + 0.5) / columns) * 2 - 1;
      final y = ((row + 0.5) / rows) * 2 - 1;
      final radius = _hypot(x, y);
      final angle = math.atan2(y, x);
      double strength;
      if (variant == PixelVariant.wave) {
        final crest = math.sin(x * math.pi * 2.3 + phase) * 0.22;
        final envelope = math.pow(math.max(0, 1 - x * x), 0.6).toDouble();
        final amplitude =
            0.12 +
            0.46 *
                envelope *
                (0.55 + 0.45 * math.pow(math.sin(x * 11 + phase), 2));
        strength = math.max(0.0, 1 - (y - crest).abs() / amplitude);
        strength *= 0.72 + 0.28 * math.cos(column * math.pi);
      } else if (variant == PixelVariant.orbit) {
        final ring = math.max(0.0, 1 - (radius - 0.62).abs() / 0.17);
        final diagonal = math.max(0.0, 1 - (y + x * 0.47).abs() / 0.13);
        final core = math.max(0.0, 1 - _hypot(x - 0.16, y + 0.03) / 0.2);
        strength = math.max(
          math.max(
            ring * (0.55 + 0.45 * math.pow(math.sin(angle + phase), 2)),
            diagonal * 0.67,
          ),
          core,
        );
        if (radius > 0.92) strength = 0;
      } else {
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
              ? 1.0
              : strength > 0.44
              ? 0.7
              : 0.35,
          color: null,
        ));
      }
    }
  }
  return (pixels: pixels, width: columns * 4, height: rows * 4);
}

double _hypot(double x, double y) {
  final a = x.abs(), b = y.abs();
  final m = math.max(a, b);
  if (m == 0) return 0;
  final p = a / m, q = b / m;
  return m * math.sqrt(p * p + q * q);
}

/// The colour of a [PixelTone] (`.lab-pixel-tone-*`: `--lab-ink`, `--lab-focus`, white,
/// `--lab-pixel-muted`).
Color pixelToneColor(ThemeData theme, PixelTone tone) {
  final mono = theme.config.palette == Palette.mono;
  final dark = theme.brightness == Brightness.dark;
  return switch (tone) {
    PixelTone.ink => theme.colors.ink,
    PixelTone.inverse => const Color(0xFFFFFFFF),
    // theme-compat.css: `.lab-pixel-tone-sage { color: var(--lab-focus) }` under a theme.
    PixelTone.sage => theme.colors.focus,
    PixelTone.muted =>
      mono
          ? (dark ? const Color(0xFF5C5C5C) : const Color(0xFFA3A3A3))
          : const Color(0xFF9DA995),
  };
}

final _artCache = <(PixelVariant, String), Artwork>{};

/// Seeded pixel artwork for identity: avatars, empty states, cards. The twin of `PixelArtwork`:
/// the same seed draws the same art on every screen. Decorative unless [title] is set.
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

  /// Motif: `voice` (multicolour fingerprint), `wave` (2:1 band), `orbit` (ring) or `spark` (star).
  final PixelVariant variant;

  /// Stable string that picks the arrangement; the same seed always draws the same art.
  final String seed;

  /// Width in pixels. Height follows the motif's aspect ratio.
  final double size;

  /// Ink for `wave`, `orbit` and `spark`. `voice` uses its own seeded palette.
  final PixelTone tone;

  /// Adds a slow breathing animation. Stays still under reduced motion.
  final bool animated;

  /// Omit for decoration; provide a title when the graphic conveys information.
  final String? title;

  @override
  State<PixelArtwork> createState() => _PixelArtworkState();
}

class _PixelArtworkState extends State<PixelArtwork>
    with SingleTickerProviderStateMixin {
  late final _breath = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 3600),
  );

  void _sync() {
    final reduced = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
    if (widget.animated && !reduced) {
      if (!_breath.isAnimating) _breath.repeat();
    } else {
      _breath
        ..stop()
        ..value = 0;
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
    final theme = ThemeProvider.of(context);
    final art = _artCache.putIfAbsent((
      widget.variant,
      widget.seed,
    ), () => artworkPixels(widget.variant, widget.seed));
    final painted = SizedBox(
      width: widget.size,
      height: widget.size * art.height / art.width,
      child: CustomPaint(
        painter: _ArtworkPainter(art, pixelToneColor(theme, widget.tone)),
      ),
    );
    final animatedArt = widget.animated
        ? AnimatedBuilder(
            animation: _breath,
            builder: (context, child) => Opacity(
              opacity: _breath.isAnimating
                  ? _breathe(_breath.value, 0.85, 1)
                  : 1,
              child: child,
            ),
            child: painted,
          )
        : painted;
    final title = widget.title;
    return title == null
        ? ExcludeSemantics(child: animatedArt)
        : Semantics(
            image: true,
            label: title,
            child: ExcludeSemantics(child: animatedArt),
          );
  }
}

/// A two-stop `ease-in-out` keyframe loop: [edge] at 0% and 100%, [middle] at 50%.
double _breathe(double t, double edge, double middle) {
  const curve = Cubic(0.42, 0, 0.58, 1);
  final half = t < 0.5 ? t * 2 : (t - 0.5) * 2;
  final e = curve.transform(half);
  return t < 0.5 ? edge + (middle - edge) * e : middle + (edge - middle) * e;
}

class _ArtworkPainter extends CustomPainter {
  _ArtworkPainter(this.art, this.ink);
  final Artwork art;
  final Color ink;

  @override
  void paint(Canvas canvas, Size size) {
    final sx = size.width / art.width, sy = size.height / art.height;
    final scale = math.min(sx, sy);
    final dx = (size.width - art.width * scale) / 2;
    final dy = (size.height - art.height * scale) / 2;
    final paint = Paint()..isAntiAlias = false;
    for (final p in art.pixels) {
      final color = p.color ?? ink;
      paint.color = color.withValues(alpha: color.a * p.opacity);
      canvas.drawRect(
        Rect.fromLTWH(dx + p.x * scale, dy + p.y * scale, 3 * scale, 3 * scale),
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(_ArtworkPainter old) => old.art != art || old.ink != ink;
}

/// Decorative pixel paint for a surface, the twin of `PixelTexture`. It fills its parent (put it
/// in a `Positioned.fill` inside the surface's Stack), ignores the pointer, is hidden from
/// assistive technology and inherits the text colour unless [tone] is set.
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

  /// Where pixels gather: `corner` toward the top end, `grain` across the field, `wave` along a band.
  final TextureVariant variant;

  /// Stable string that picks the arrangement, such as a record id.
  final String seed;

  /// How many squares are drawn.
  final TextureDensity density;

  /// Ink colour. Null inherits the surface's text colour.
  final PixelTone? tone;

  /// Adds a slow opacity pulse. Stays still under reduced motion.
  final bool animated;

  /// Overall opacity (`--pixel-texture-opacity`, default 0.13).
  final double opacity;

  @override
  State<PixelTexture> createState() => _PixelTextureState();
}

class _PixelTextureState extends State<PixelTexture>
    with SingleTickerProviderStateMixin {
  late final _pulse = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 2800),
  );

  void _sync() {
    final reduced = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
    if (widget.animated && !reduced) {
      if (!_pulse.isAnimating) _pulse.repeat();
    } else {
      _pulse
        ..stop()
        ..value = 0;
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
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = ThemeProvider.of(context);
    final color = widget.tone != null
        ? pixelToneColor(theme, widget.tone!)
        : DefaultTextStyle.of(context).style.color ?? theme.colors.ink;
    return IgnorePointer(
      child: ExcludeSemantics(
        child: SizedBox.expand(
          // The SVG clips its sliced view box to the box.
          child: ClipRect(
            child: AnimatedBuilder(
              animation: _pulse,
              builder: (context, _) => CustomPaint(
                painter: _TexturePainter(
                  color: color,
                  opacity: _pulse.isAnimating
                      ? _breathe(_pulse.value, 1, 0.55) * widget.opacity
                      : widget.opacity,
                  variant: widget.variant,
                  seed: widget.seed,
                  density: widget.density,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _TexturePainter extends CustomPainter {
  _TexturePainter({
    required this.color,
    required this.opacity,
    required this.variant,
    required this.seed,
    required this.density,
  });
  final Color color;
  final double opacity;
  final TextureVariant variant;
  final String seed;
  final TextureDensity density;

  @override
  void paint(Canvas canvas, Size size) => paintPixelTexture(
    canvas,
    Offset.zero & size,
    color: color,
    opacity: opacity,
    variant: variant,
    seed: seed,
    density: density,
  );

  @override
  bool shouldRepaint(_TexturePainter old) =>
      old.color != color ||
      old.opacity != opacity ||
      old.variant != variant ||
      old.seed != seed ||
      old.density != density;
}
