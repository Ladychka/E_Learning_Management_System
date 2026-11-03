import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/errors.dart';
import '../../../data/models/enrollment_model.dart';
import '../../../data/services/api_service.dart';

part 'enrollment_state.dart';

class EnrollmentCubit extends Cubit<EnrollmentState> {
  final ApiService _api = ApiService();

  EnrollmentCubit() : super(const EnrollmentInitial());

  Future<void> fetchMyEnrollments() async {
    emit(const EnrollmentLoading());
    try {
      final res = await _api.get(
        '/enrollments/my-enrollments',
        queryParameters: {'limit': '50'},
      );
      final list = (res.data['data'] as List<dynamic>)
          .map((e) => Enrollment.fromJson(e as Map<String, dynamic>))
          .toList();
      emit(EnrollmentsLoaded(list));
    } on Failure catch (e) {
      emit(EnrollmentError(e.message));
    } catch (e) {
      emit(EnrollmentError(e.toString()));
    }
  }

  Future<void> unenroll(String enrollmentId) async {
    try {
      await _api.delete('/enrollments/$enrollmentId');
      fetchMyEnrollments();
    } catch (_) {
      // ignore
    }
  }

  int get activeCount {
    if (state is EnrollmentsLoaded) {
      return (state as EnrollmentsLoaded)
          .enrollments
          .where((e) => e.isActive)
          .length;
    }
    return 0;
  }

  int get completedCount {
    if (state is EnrollmentsLoaded) {
      return (state as EnrollmentsLoaded)
          .enrollments
          .where((e) => e.isCompleted)
          .length;
    }
    return 0;
  }

  List<Enrollment> get inProgress {
    if (state is EnrollmentsLoaded) {
      return (state as EnrollmentsLoaded)
          .enrollments
          .where((e) => e.isActive && (e.progress ?? 0) < 1.0)
          .toList();
    }
    return [];
  }
}
