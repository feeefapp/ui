import 'dart:convert';
import 'dart:io';

import 'package:feeef_ui/i18n/i18n.dart';
import 'package:feeef_ui/i18n/i18n_core.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  providerTests();
  test('ICU messages format like intl-messageformat', () {
    final cases =
        jsonDecode(File('test/fixtures/icu.json').readAsStringSync()) as List;
    for (final c in cases) {
      final params = (c[2] as Map).cast<String, Object>();
      expect(
        formatMessage(c[0], c[1], params),
        c[3],
        reason: '${c[0]} ${c[1]} $params',
      );
    }
  });

  test('direction, lookup and flattening', () {
    expect(directionFor('ar-DZ'), TextDirection.rtl);
    expect(directionFor('fr'), TextDirection.ltr);
    expect(translate({'lab.a': 'Hi {n}'}, 'en', 'lab.a', {'n': 'x'}), 'Hi x');
    expect(translate({}, 'en', 'lab.missing'), 'lab.missing');
    expect(
      flattenTranslations({
        'voice': {
          'title': 'Voice',
          'x': {'y': 'z'},
        },
      }),
      {'lab.voice.title': 'Voice', 'lab.voice.x.y': 'z'},
    );
  });
}

void providerTests() {
  testWidgets('a provider localizes kit labels and sets the direction', (
    tester,
  ) async {
    late I18n i18n;
    late TextDirection direction;
    await tester.pumpWidget(
      I18nProvider(
        locale: 'ar',
        translations: const {
          'lab.custom': '{n, plural, one {طلب} other {# طلبات}}',
        },
        child: Builder(
          builder: (context) {
            i18n = I18n.of(context);
            direction = Directionality.of(context);
            return const SizedBox();
          },
        ),
      ),
    );
    expect(direction, TextDirection.rtl);
    expect(i18n.t('lab.common.moreActions'), isNot('lab.common.moreActions'));
    expect(i18n.t('lab.custom', {'n': 3}), '3 طلبات');
    expect(I18n.fallback.t('lab.common.close'), 'Close');
  });
}
