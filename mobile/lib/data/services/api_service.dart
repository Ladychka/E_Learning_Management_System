import 'package:dio/dio.dart';

import '../../core/constants.dart';
import '../../core/errors.dart';
import 'auth_service.dart';

class ApiService {
  late final Dio _dio;
  final AuthService _authService = AuthService();
  bool _isRefreshing = false;

  ApiService() {
    _dio = Dio(
      BaseOptions(
        baseUrl: ApiConstants.baseUrl,
        connectTimeout: ApiConstants.connectTimeout,
        receiveTimeout: ApiConstants.receiveTimeout,
        headers: {'Content-Type': 'application/json'},
      ),
    );

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _authService.getAccessToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onError: (error, handler) async {
          if (error.response?.statusCode == 401) {
            final refreshed = await _refreshToken();
            if (refreshed != null) {
              error.requestOptions.headers['Authorization'] =
                  'Bearer $refreshed';
              final retry = await _dio.fetch(error.requestOptions);
              return handler.resolve(retry);
            } else {
              await _authService.clearTokens();
            }
          }
          handler.next(error);
        },
      ),
    );
  }

  Dio get client => _dio;

  Future<String?> _refreshToken() async {
    if (_isRefreshing) return null;
    _isRefreshing = true;

    try {
      final refreshToken = await _authService.getRefreshToken();
      if (refreshToken == null) return null;

      final response = await Dio().post(
        '${ApiConstants.baseUrl}/auth/refresh',
        data: {'refreshToken': refreshToken},
      );

      final newAccess = response.data['data']['accessToken'] as String?;
      if (newAccess != null) {
        await _authService.saveTokens(newAccess, refreshToken);
      }
      return newAccess;
    } catch (_) {
      return null;
    } finally {
      _isRefreshing = false;
    }
  }

  Future<Response> get(String path,
      {Map<String, dynamic>? queryParameters}) async {
    try {
      return await _dio.get(path, queryParameters: queryParameters);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<Response> post(String path, {dynamic data}) async {
    try {
      return await _dio.post(path, data: data);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<Response> patch(String path, {dynamic data}) async {
    try {
      return await _dio.patch(path, data: data);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<Response> delete(String path) async {
    try {
      return await _dio.delete(path);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Failure _handleError(DioException error) {
    if (error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout ||
        error.type == DioExceptionType.connectionError) {
      return const NetworkFailure('Network connection error');
    }

    final statusCode = error.response?.statusCode;
    final data = error.response?.data;
    String message = 'Server error';
    if (data is Map && data.containsKey('message')) {
      message = data['message']?.toString() ?? 'Server error';
    } else if (data != null) {
      message = data.toString();
    }

    if (statusCode == 401) {
      return AuthFailure(message);
    }
    return ServerFailure(message);
  }
}
