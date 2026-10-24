import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/errors.dart';
import '../../../data/models/user_model.dart';
import '../../../data/services/api_service.dart';
import '../../../data/services/auth_service.dart';

part 'auth_state.dart';

class AuthCubit extends Cubit<AuthState> {
  final AuthService _authService = AuthService();
  final ApiService _api = ApiService();

  AuthCubit() : super(const AuthInitial());

  Future<void> init() async {
    emit(const AuthLoading());
    try {
      final token = await _authService.getAccessToken();
      if (token == null) {
        emit(const AuthUnauthenticated());
        return;
      }
      final res = await _api.get('/auth/me');
      final user = User.fromJson(res.data['data'] as Map<String, dynamic>);
      emit(AuthAuthenticated(user));
    } catch (_) {
      await _authService.clearTokens();
      emit(const AuthUnauthenticated());
    }
  }

  Future<void> login(String email, String password) async {
    emit(const AuthLoading());
    try {
      final res = await _api.post('/auth/login', data: {
        'email': email,
        'password': password,
      });
      final data = res.data['data'] as Map<String, dynamic>;
      final user = User.fromJson(data['user'] as Map<String, dynamic>);

      await _authService.saveTokens(
        data['accessToken'] as String? ?? '',
        data['refreshToken'] as String? ?? '',
      );
      emit(AuthAuthenticated(user));
    } on Failure catch (e) {
      emit(AuthError(e.message));
    } catch (e) {
      emit(AuthError(e.toString()));
    }
  }

  Future<void> register({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
  }) async {
    emit(const AuthLoading());
    try {
      await _api.post('/auth/register', data: {
        'email': email,
        'password': password,
        'firstName': firstName,
        'lastName': lastName,
      });
      // Registration successful; require login
      emit(const AuthUnauthenticated());
    } on Failure catch (e) {
      emit(AuthError(e.message));
    } catch (e) {
      emit(AuthError(e.toString()));
    }
  }

  Future<void> logout() async {
    emit(const AuthLoading());
    try {
      await _api.post('/auth/logout');
    } catch (_) {
      // ignore
    }
    await _authService.clearTokens();
    emit(const AuthUnauthenticated());
  }

  Future<void> updateProfile(Map<String, dynamic> data) async {
    final current = state;
    if (current is! AuthAuthenticated) return;
    try {
      final res = await _api.patch('/auth/profile', data: data);
      final user = User.fromJson(res.data['data'] as Map<String, dynamic>);
      emit(AuthAuthenticated(user));
    } on Failure catch (e) {
      emit(AuthError(e.message));
      // Re-emit authenticated so the screen doesn't get stuck in error
      emit(current);
    } catch (e) {
      emit(AuthError(e.toString()));
      emit(current);
    }
  }
}
