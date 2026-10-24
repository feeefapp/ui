import 'dart:async';
import 'dart:convert';

import 'package:feeef_ui/feeef_ui.dart';
import 'package:flutter/widgets.dart';

const _stops = [
  LadderStop(
    modelId: 'flux-schnell',
    modelName: 'FLUX Schnell',
    label: 'Fast',
    access: .free,
  ),
  LadderStop(
    modelId: 'imagen-standard',
    modelName: 'Imagen',
    label: 'Balanced',
    access: .pro,
  ),
  LadderStop(
    modelId: 'gpt-image-high',
    modelName: 'GPT Image',
    label: 'Best',
    access: .pro,
  ),
];
const _templates = [
  ComposerTemplate(
    id: 'studio',
    name: 'Studio shot',
    prompt: 'The product on a seamless beige backdrop, soft daylight, 50mm.',
  ),
  ComposerTemplate(
    id: 'lifestyle',
    name: 'Lifestyle',
    prompt: 'The product on a kitchen counter in morning light, shallow depth of field.',
  ),
];
const _recent = [
  RecentImage(
    id: 'side',
    prompt: 'Bottle, side',
    thumbUrl: '',
    preview: CustomPaint(painter: _Photo(Color(0xFFEFE6DA), Color(0xFFB9824F))),
  ),
  RecentImage(
    id: 'back',
    prompt: 'Bottle, back',
    thumbUrl: '',
    preview: CustomPaint(painter: _Photo(Color(0xFFDFE8EE), Color(0xFF4F7894))),
  ),
  RecentImage(
    id: 'cap',
    prompt: 'Bottle cap',
    thumbUrl: '',
    preview: CustomPaint(painter: _Photo(Color(0xFFECE3EE), Color(0xFF8A5F96))),
  ),
];

class ImageComposer extends StatefulWidget {
  const ImageComposer({super.key});

  @override
  State<ImageComposer> createState() => _ImageComposerState();
}

class _ImageComposerState extends State<ImageComposer> {
  String _prompt = '';
  int _model = 1;
  String _shape = '1:1';
  List<ComposerReference> _references = const [
    ComposerReference(
      id: 'front',
      name: 'Bottle front',
      url: '',
      preview: CustomPaint(painter: _Photo(Color(0xFFE8EAE4), Color(0xFF6F8965))),
    ),
  ];
  bool _submitting = false;
  Timer? _timer;

  void _add(List<ComposerReference> added) => setState(
    () => _references = [..._references, ...added].take(4).toList(),
  );

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 560,
      child: Padding(
        padding: const EdgeInsets.only(top: 72),
        child: ImagePromptComposer(
          mode: .image,
          prompt: _prompt,
          onPrompt: (value) => setState(() => _prompt = value),
          placeholder: 'Describe the image you want',
          maxLength: 2000,
          references: _references,
          referenceLimit: const ReferenceLimit(
            max: 4,
            formats: ['image/png', 'image/jpeg', 'image/webp'],
          ),
          onAddFiles: (files) => _add([
            for (final file in files)
              ComposerReference(
                id: '${file.name}-${file.bytes.length}',
                name: file.name,
                url: 'data:${file.type};base64,${base64Encode(file.bytes)}',
              ),
          ]),
          onRemoveReference: (id) => setState(
            () => _references = [
              for (final ref in _references)
                if (ref.id != id) ref,
            ],
          ),
          recent: [
            for (final image in _recent)
              if (!_references.any((ref) => ref.id == image.id)) image,
          ],
          onUseRecent: (id) {
            final image = _recent.firstWhere((recent) => recent.id == id);
            _add([
              ComposerReference(
                id: id,
                name: image.prompt,
                url: image.thumbUrl,
                preview: image.preview,
              ),
            ]);
          },
          onEditPhoto: (_) {},
          templates: _templates,
          onTemplate: (template) => setState(() => _prompt = template.prompt),
          ladder: ModelLadder(
            variant: .compact,
            stops: _stops,
            index: _model,
            defaultIndex: 1,
            onChange: (value) => setState(() => _model = value),
          ),
          settingsLabel: _shape,
          settings: DecoratedBox(
            decoration: ShapeDecoration(
              color: ThemeProvider.of(context).colors.surfaceSoft,
              shape: SuperellipseBorder(
                radius: ThemeProvider.of(context).sizes.radiusControl,
              ),
            ),
            child: SegmentedControl<String>(
              label: 'Shape',
              value: _shape,
              onChange: (value) => setState(() => _shape = value),
              options: const [
                SegmentOption(value: '1:1', label: 'Square'),
                SegmentOption(value: '4:5', label: 'Portrait'),
                SegmentOption(value: '16:9', label: 'Wide'),
              ],
            ),
          ),
          enhancing: null,
          onEnhance: (mode) {
            if (mode == .ideas) setState(() => _prompt = _templates[0].prompt);
          },
          onSubmit: () {
            setState(() => _submitting = true);
            _timer = Timer(
              const Duration(milliseconds: 1500),
              () => setState(() => _submitting = false),
            );
          },
          submitDisabled: _prompt.trim().isEmpty,
          submitting: _submitting,
          submitLabel: 'Create image',
          caption: const Text('About 4 DZD per image · 3 free today'),
        ),
      ),
    );
  }
}

/// A product photo: a bottle on a pale ground (the web example's SVG).
class _Photo extends CustomPainter {
  const _Photo(this.ground, this.bottle);
  final Color ground, bottle;

  @override
  void paint(Canvas canvas, Size size) {
    final k = size.width / 80;
    canvas.drawRect(Offset.zero & size, Paint()..color = ground);
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(26 * k, 18 * k, 28 * k, 44 * k),
        Radius.circular(6 * k),
      ),
      Paint()..color = bottle,
    );
  }

  @override
  bool shouldRepaint(_Photo old) => old.ground != ground || old.bottle != bottle;
}
