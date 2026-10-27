import 'dart:js_interop';
import 'dart:js_interop_unsafe';

import 'package:flutter/widgets.dart';

/// An empty, invisible element of the page that takes the pointer (and lets it bubble up to
/// Flutter), laid over any platform view below it.
Widget shieldElement() => HtmlElementView.fromTagName(
  tagName: 'div',
  isVisible: false,
  onElementCreated: (element) {
    final style = (element as JSObject).getProperty<JSObject>('style'.toJS);
    style
      ..setProperty('width'.toJS, '100%'.toJS)
      ..setProperty('height'.toJS, '100%'.toJS);
  },
);

bool _captureInstalled = false;

/// A press that starts on Flutter keeps every move and the release, even over an embedded page:
/// while a pointer pressed outside the platform views is down, their iframes ignore the pointer.
/// (A drag that leaves a sheet or the canvas would otherwise lose its moves to the iframe under
/// the pointer.) Presses inside an iframe never reach this page, so the pages keep theirs.
void installPointerCapture() {
  if (_captureInstalled) return;
  _captureInstalled = true;
  final document = globalContext.getProperty<JSObject>('document'.toJS);
  final root = document.getProperty<JSObject>('documentElement'.toJS);
  final classes = root.getProperty<JSObject>('classList'.toJS);
  final style = document.callMethod<JSObject>(
    'createElement'.toJS,
    'style'.toJS,
  );
  style.setProperty(
    'textContent'.toJS,
    'html.flt-pointer-held flt-platform-view iframe{pointer-events:none!important}'
        .toJS,
  );
  document
      .getProperty<JSObject>('head'.toJS)
      .callMethod<JSAny?>('appendChild'.toJS, style);
  void hold(JSAny? _) =>
      classes.callMethod<JSAny?>('add'.toJS, 'flt-pointer-held'.toJS);
  void release(JSAny? _) =>
      classes.callMethod<JSAny?>('remove'.toJS, 'flt-pointer-held'.toJS);
  final window = globalContext;
  final capture = {'capture': true}.jsify();
  window.callMethod<JSAny?>(
    'addEventListener'.toJS,
    'pointerdown'.toJS,
    hold.toJS,
    capture,
  );
  for (final type in ['pointerup', 'pointercancel', 'blur']) {
    window.callMethod<JSAny?>(
      'addEventListener'.toJS,
      type.toJS,
      release.toJS,
      capture,
    );
  }
}
