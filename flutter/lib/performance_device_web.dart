import 'dart:js_interop';
import 'dart:js_interop_unsafe';

import 'performance.dart';

/// The web: `navigator.hardwareConcurrency`, `navigator.deviceMemory` (Chromium only), whether
/// the page is cross-origin isolated with a wasm build (the renderer then has its own thread) and
/// whether WebGL runs on a real GPU.
DeviceTraits readDeviceTraits() {
  final navigator = globalContext.getProperty<JSObject?>('navigator'.toJS);
  double? number(String name) {
    final value = navigator?.getProperty<JSAny?>(name.toJS);
    return value != null && value.typeofEquals('number')
        ? (value as JSNumber).toDartDouble
        : null;
  }

  final isolated =
      globalContext
          .getProperty<JSAny?>('crossOriginIsolated'.toJS)
          ?.dartify() ==
      true;
  const wasm = bool.fromEnvironment('dart.tool.dart2wasm');
  return DeviceTraits(
    web: true,
    cores: number('hardwareConcurrency')?.round(),
    memoryGb: number('deviceMemory'),
    threaded: wasm && isolated,
    softwareGpu: !_hardwareWebGl(),
  );
}

/// Whether the browser gives WebGL a GPU: with `failIfMajorPerformanceCaveat` it refuses a
/// context it would draw in software (SwiftShader, llvmpipe, a blocklisted driver). The probe
/// context is released at once (browsers cap live contexts).
bool _hardwareWebGl() {
  try {
    final document = globalContext.getProperty<JSObject?>('document'.toJS);
    final canvas = document?.callMethod<JSObject?>(
      'createElement'.toJS,
      'canvas'.toJS,
    );
    if (canvas == null) return true;
    final options = JSObject()
      ..setProperty('failIfMajorPerformanceCaveat'.toJS, true.toJS);
    final gl =
        canvas.callMethod<JSObject?>(
          'getContext'.toJS,
          'webgl2'.toJS,
          options,
        ) ??
        canvas.callMethod<JSObject?>('getContext'.toJS, 'webgl'.toJS, options);
    if (gl == null) return false;
    gl
        .callMethod<JSObject?>('getExtension'.toJS, 'WEBGL_lose_context'.toJS)
        ?.callMethod<JSAny?>('loseContext'.toJS);
    return true;
  } catch (_) {
    // A browser that throws here gets the benefit of the doubt.
    return true;
  }
}

const _slowKey = 'feeef_ui.slow';

JSObject? get _storage {
  try {
    return globalContext.getProperty<JSObject?>('localStorage'.toJS);
  } catch (_) {
    return null;
  }
}

/// Whether this browser measured slow within [remember].
bool rememberedSlow(Duration remember) {
  try {
    final at = int.tryParse(
      _storage?.callMethod<JSString?>('getItem'.toJS, _slowKey.toJS)?.toDart ??
          '',
    );
    if (at == null) return false;
    final age = DateTime.now().millisecondsSinceEpoch - at;
    return age >= 0 && age < remember.inMilliseconds;
  } catch (_) {
    return false;
  }
}

void rememberSlow() {
  try {
    _storage?.callMethod<JSAny?>(
      'setItem'.toJS,
      _slowKey.toJS,
      '${DateTime.now().millisecondsSinceEpoch}'.toJS,
    );
  } catch (_) {}
}

void forgetSlow() {
  try {
    _storage?.callMethod<JSAny?>('removeItem'.toJS, _slowKey.toJS);
  } catch (_) {}
}
