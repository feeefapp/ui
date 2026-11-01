import 'dart:async';

import 'package:devtools_extensions/devtools_extensions.dart';
import 'package:flutter/foundation.dart';
import 'package:vm_service/vm_service.dart';

/// Talks to `ext.feeef_ui.*` in the connected app (`package:feeef_ui/devtools/devtools.dart`).
class KitController extends ChangeNotifier {
  KitController() {
    _available = serviceManager.serviceExtensionManager.hasServiceExtension(
      '$_prefix.getState',
    )..addListener(_onAvailable);
    _onAvailable();
  }

  static const _prefix = 'ext.feeef_ui';
  static const _stateChanged = 'feeef_ui:stateChanged';

  late final ValueListenable<bool> _available;
  StreamSubscription<Event>? _events;

  /// The last `getState` answer; null before the first one.
  Map<String, Object?>? state;

  /// The last call's error.
  String? error;

  bool loading = false;

  /// The app registered the kit's extensions (a [ThemeProvider] has built).
  bool get available => _available.value;

  Future<void> _onAvailable() async {
    if (!available) {
      notifyListeners();
      return;
    }
    await _listen();
    await refresh();
  }

  Future<void> _listen() async {
    final service = serviceManager.service;
    if (service == null || _events != null) return;
    try {
      await service.streamListen(EventStreams.kExtension);
    } on RPCError {
      // Already subscribed on this connection.
    }
    _events = service.onExtensionEvent
        .where((event) => event.extensionKind == _stateChanged)
        .listen((_) => refresh());
  }

  Future<void> refresh() => _call('getState');

  /// Sends overrides (`''` drops a key); [clear] drops every other one first.
  Future<void> setOverride(Map<String, String> options, {bool clear = false}) =>
      _call('setThemeOverride', {...options, if (clear) 'clear': 'true'});

  Future<void> setMeasuredSlow(bool slow) =>
      _call('setMeasuredSlow', {'value': '$slow'});

  Future<void> _call(String method, [Map<String, String>? args]) async {
    loading = true;
    notifyListeners();
    try {
      final response = await serviceManager.callServiceExtensionOnMainIsolate(
        '$_prefix.$method',
        args: args,
      );
      state = response.json?.cast<String, Object?>();
      error = null;
    } catch (e) {
      error = e is RPCError ? (e.details ?? e.message) : '$e';
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  @override
  void dispose() {
    _available.removeListener(_onAvailable);
    unawaited(_events?.cancel());
    super.dispose();
  }
}
