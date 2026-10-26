/// Shared payload shapes for the Lab image studio: the twin of `@feeef.dev/ui/image/types`. See
/// docs/lab-image-studio.md.
library;

import 'package:flutter/foundation.dart';

/// Output options of a generation. Every field is optional, as in the web kit's
/// `Partial<Record<…, string>>`.
@immutable
class ImageOptions {
  const ImageOptions({
    this.aspectRatio,
    this.size,
    this.imageSize,
    this.quality,
    this.background,
    this.outputFormat,
  });

  /// Reads the options as the Lab API serves them.
  factory ImageOptions.fromJson(Map<String, Object?> json) => ImageOptions(
    aspectRatio: json['aspectRatio'] as String?,
    size: json['size'] as String?,
    imageSize: json['imageSize'] as String?,
    quality: json['quality'] as String?,
    background: json['background'] as String?,
    outputFormat: json['outputFormat'] as String?,
  );

  /// `1:1`, `4:5`, `16:9`…
  final String? aspectRatio;

  /// Pixel size such as `1024x1536`; used for the shape when there is no [aspectRatio].
  final String? size;
  final String? imageSize, quality, background, outputFormat;

  Map<String, String> toJson() => {
    'aspectRatio': ?aspectRatio,
    'size': ?size,
    'imageSize': ?imageSize,
    'quality': ?quality,
    'background': ?background,
    'outputFormat': ?outputFormat,
  };

  @override
  bool operator ==(Object other) =>
      other is ImageOptions &&
      other.aspectRatio == aspectRatio &&
      other.size == size &&
      other.imageSize == imageSize &&
      other.quality == quality &&
      other.background == background &&
      other.outputFormat == outputFormat;

  @override
  int get hashCode => Object.hash(
    aspectRatio,
    size,
    imageSize,
    quality,
    background,
    outputFormat,
  );
}

/// What produced a take.
enum ImageOperation {
  generate,
  edit,
  inpaint,
  variation,
  upscale,
  // ignore: constant_identifier_names
  remove_bg,
  expand,
}

/// The saved state of an image project.
@immutable
class ImageDocument {
  const ImageDocument({
    required this.prompt,
    this.model,
    this.options = const ImageOptions(),
    this.selectedTakeId,
  });

  /// Schema version (always 1).
  int get v => 1;
  final String prompt;
  final String? model;
  final ImageOptions options;
  final String? selectedTakeId;
}

/// A take's progress.
enum TakeStatus { pending, processing, completed, failed }

/// `image` for pictures; `poster` for image landing pages, made in Poster mode.
enum ImageTakeKind { image, poster }

/// The copy Cloud wrote for a poster, reusable on a product page.
@immutable
class PosterCopy {
  const PosterCopy({required this.facts, required this.copy});
  final String facts, copy;
}

/// One version of an image: the twin of `ImageTake`.
@immutable
class ImageTake {
  const ImageTake({
    required this.id,
    this.operation = ImageOperation.generate,
    this.parentTakeId,
    required this.status,
    this.error,
    this.errorCode,
    required this.createdAt,
    this.starred = false,
    this.prompt = '',
    this.model = '',
    this.options = const ImageOptions(),
    this.referenceCount = 0,
    this.hasMask = false,
    this.chargeDzd,
    this.chargeUsd,
    this.kind = ImageTakeKind.image,
    this.copy,
    this.fileUrl = '',
    this.thumbUrl = '',
  });

  final String id;
  final ImageOperation operation;
  final String? parentTakeId;
  final TakeStatus status;
  final String? error;

  /// Stable failure code (Cloud/provider); the board shows a translated message when it knows it.
  final String? errorCode;

  /// ISO 8601 creation time.
  final String createdAt;
  final bool starred;
  final String prompt;
  final String model;
  final ImageOptions options;
  final int referenceCount;
  final bool hasMask;
  final String? chargeDzd;

  /// What Cloud charged, in USD.
  final double? chargeUsd;

  /// `poster` for image landing pages, made in Poster mode.
  final ImageTakeKind kind;

  /// For posters: the copy Cloud wrote, reusable on a product page.
  final PosterCopy? copy;
  final String fileUrl;
  final String thumbUrl;

  ImageTake copyWith({
    TakeStatus? status,
    String? error,
    String? errorCode,
    bool? starred,
    String? fileUrl,
    String? thumbUrl,
  }) => ImageTake(
    id: id,
    operation: operation,
    parentTakeId: parentTakeId,
    status: status ?? this.status,
    error: error ?? this.error,
    errorCode: errorCode ?? this.errorCode,
    createdAt: createdAt,
    starred: starred ?? this.starred,
    prompt: prompt,
    model: model,
    options: options,
    referenceCount: referenceCount,
    hasMask: hasMask,
    chargeDzd: chargeDzd,
    chargeUsd: chargeUsd,
    kind: kind,
    copy: copy,
    fileUrl: fileUrl ?? this.fileUrl,
    thumbUrl: thumbUrl ?? this.thumbUrl,
  );
}
