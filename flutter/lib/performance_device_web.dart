import 'dart:js_interop';
import 'dart:js_interop_unsafe';

import 'performance.dart';

/// The web: `navigator.hardwareConcurrency`, `navigator.deviceMemory` (Chromium only) and whether
/// the page is cross-origin isolated with a wasm build (the renderer then has its own thread).
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
  );
}
