import 'dart:convert';
import 'dart:typed_data';
import 'dart:ui' show Color;

/// Feeef upload URL hints: `?w=<pixels>&h=<pixels>&th=<base64url ThumbHash>`.
/// Presentation only; never use editable URL hints for validation or billing.
class ImageUrlMetadata {
  const ImageUrlMetadata({
    required this.width,
    required this.height,
    this.thumbHash,
  });
  final int width, height;
  final Uint8List? thumbHash;
  double get aspectRatio => width / height;
  static ImageUrlMetadata? parse(String url) {
    final uri = Uri.tryParse(url);
    if (uri == null) return null;
    final width = int.tryParse(uri.queryParameters['w'] ?? '');
    final height = int.tryParse(uri.queryParameters['h'] ?? '');
    if (width == null ||
        height == null ||
        width <= 0 ||
        height <= 0 ||
        width > 100000 ||
        height > 100000) {
      return null;
    }
    Uint8List? hash;
    final raw = uri.queryParameters['th'];
    if (raw != null && raw.length <= 256) {
      try {
        final decoded = base64Url.decode(base64Url.normalize(raw));
        if (decoded.length >= 5 && decoded.length <= 128) hash = decoded;
      } catch (_) {
        /* Bad placeholder must not break an image. */
      }
    }
    return ImageUrlMetadata(width: width, height: height, thumbHash: hash);
  }

  /// ThumbHash's DC component gives a faithful placeholder ground immediately.
  /// The final raster replaces it without changing the reserved aspect ratio.
  Color? get placeholderColor {
    final hash = thumbHash;
    if (hash == null || hash.length < 5) return null;
    final header = hash[0] | (hash[1] << 8) | (hash[2] << 16);
    final l = (header & 63) / 63;
    final p = ((header >> 6) & 63) / 31.5 - 1;
    final q = ((header >> 12) & 63) / 31.5 - 1;
    final b = l - 2 / 3 * p;
    final r = (3 * l - b + q) / 2;
    final g = r - q;
    final alpha = (header & (1 << 23)) != 0 && hash.length > 5
        ? (hash[5] & 15) / 15
        : 1.0;
    return Color.fromRGBO(
      (r.clamp(0, 1) * 255).round(),
      (g.clamp(0, 1) * 255).round(),
      (b.clamp(0, 1) * 255).round(),
      alpha,
    );
  }
}
