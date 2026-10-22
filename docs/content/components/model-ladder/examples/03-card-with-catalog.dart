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
    priceUsd: 0.04,
  ),
  LadderStop(
    modelId: 'gpt-image-high',
    modelName: 'GPT Image',
    label: 'Best',
    access: .pro,
    priceUsd: 0.17,
  ),
];
const _catalog = [
  ..._stops,
  LadderStop(
    modelId: 'flux-pro',
    modelName: 'FLUX Pro',
    label: 'FLUX Pro',
    description: 'Sharp product shots',
    access: .pro,
  ),
  LadderStop(
    modelId: 'ideogram-v3',
    modelName: 'Ideogram 3',
    label: 'Ideogram 3',
    description: 'Text in images',
    access: .pro,
  ),
  LadderStop(
    modelId: 'recraft-v3',
    modelName: 'Recraft V3',
    label: 'Recraft V3',
    description: 'Vector and brand art',
    access: .pro,
  ),
  LadderStop(
    modelId: 'seedream-4',
    modelName: 'Seedream 4',
    label: 'Seedream 4',
    description: 'Photoreal scenes',
    access: .pro,
  ),
];

class CardWithCatalog extends StatefulWidget {
  const CardWithCatalog({super.key});

  @override
  State<CardWithCatalog> createState() => _CardWithCatalogState();
}

class _CardWithCatalogState extends State<CardWithCatalog> {
  int _index = 1;
  LadderStop? _specific;

  @override
  Widget build(BuildContext context) => ConstrainedBox(
    constraints: const BoxConstraints(maxWidth: 340),
    child: SizedBox(
      width: double.infinity,
      child: ModelLadderCard(
        stops: _stops,
        index: _index,
        defaultIndex: 1,
        onChange: (next) => setState(() {
          _specific = null;
          _index = next;
        }),
        catalog: _catalog,
        selectedModel: _specific,
        onPickModel: (id) => setState(
          () => _specific = _catalog.firstWhere((model) => model.modelId == id),
        ),
        canvas: const AspectReadout(
          size: '1024 × 1024',
          aspect: '1:1',
          widthOverHeight: 1,
        ),
      ),
    ),
  );
}
