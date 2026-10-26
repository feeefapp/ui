import 'dart:io' show Platform;

import 'performance.dart';

/// Native: the processor count from the OS (memory isn't exposed).
DeviceTraits readDeviceTraits() =>
    DeviceTraits(web: false, cores: Platform.numberOfProcessors);
