import 'constants.dart';

/// Resolves a backend media path (e.g. `/uploads/thumbnails/x.png`) into an
/// absolute URL that Flutter's Image.network can load.
String resolveMediaUrl(String? url) {
  if (url == null || url.isEmpty) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  final apiRoot = ApiConstants.baseUrl.replaceAll('/api/v1', '');
  return url.startsWith('/') ? '$apiRoot$url' : '$apiRoot/$url';
}
