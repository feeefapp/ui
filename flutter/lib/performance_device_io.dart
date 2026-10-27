import 'dart:io' show Platform;

import 'performance.dart';

/// Native: the processor count from the OS (memory isn't exposed).
DeviceTraits readDeviceTraits() =>
    DeviceTraits(web: false, cores: Platform.numberOfProcessors);

/// Native apps don't remember a measured slow device between launches.
bool rememberedSlow(Duration remember) => false;

void rememberSlow() {}

void forgetSlow() {}
