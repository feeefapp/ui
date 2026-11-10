import 'package:feeef_ui/image/image_url_metadata.dart';
import 'package:feeef_ui/image/freeform_board.dart';
import 'package:feeef_ui/feeef_ui.dart' show ImageTake, TakeStatus;
import 'package:flutter_test/flutter_test.dart';

void main() {
  test(
    'Feeef dimensions reserve exact card proportions before image decoding',
    () {
      final metadata = ImageUrlMetadata.parse(
        'https://storage.feeef.net/a.webp?w=600&h=2400&th=YWJj',
      );
      expect(metadata?.aspectRatio, .25);
      final cards = layoutCards([
        const ImageTake(
          id: 'poster',
          status: TakeStatus.completed,
          createdAt: '',
          fileUrl: 'https://storage.feeef.net/a.webp?w=600&h=4800',
        ),
      ], {});
      expect(cards.single.w / cards.single.h, closeTo(1 / 8, .002));
    },
  );
  test('invalid dimensions are ignored as untrusted presentation hints', () {
    expect(ImageUrlMetadata.parse('https://cdn.example/a?w=-1&h=0'), isNull);
    expect(ImageUrlMetadata.parse('https://cdn.example/a?w=NaN&h=100'), isNull);
  });
  test('host-provided decoded ratios override stale URL hints without square clamping', () {
    final cards = layoutCards(
      [
        const ImageTake(
          id: 'wide',
          status: TakeStatus.completed,
          createdAt: '',
          fileUrl: 'https://cdn.example/a?w=100&h=100',
        ),
      ],
      {'wide': 8},
    );
    expect(cards.single.w / cards.single.h, closeTo(8, .002));
  });
}
