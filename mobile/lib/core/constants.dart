import 'package:flutter/foundation.dart';

class ApiConstants {
  /// Backend API base URL.
  ///
  /// Change this to match your setup:
  /// - Android emulator: http://10.0.2.2:5000/api/v1
  /// - Windows / macOS / Linux / iOS Simulator: http://localhost:5000/api/v1
  /// - Physical device on same WiFi: http://YOUR_PC_IP:5000/api/v1
  /// - Chrome/web: http://localhost:5000/api/v1 (same origin, different port)
  static String get baseUrl {
    if (kIsWeb) {
      return 'http://localhost:5000/api/v1';
    }
    if (defaultTargetPlatform == TargetPlatform.android) {
      // Android emulator loopback; use your PC LAN IP for physical devices
      return 'http://10.0.2.2:5000/api/v1';
    }
    // Windows, macOS, Linux, iOS Simulator
    return 'http://localhost:5000/api/v1';
  }

  static const Duration connectTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);
}
