import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/errors.dart';
import '../../../data/models/grade_model.dart';
import '../../../data/services/api_service.dart';

part 'grade_state.dart';

class GradeCubit extends Cubit<GradeState> {
  final ApiService _api = ApiService();

  GradeCubit() : super(const GradeInitial());

  Future<void> fetchMyGrades() async {
    emit(const GradeLoading());
    try {
      final res = await _api.get('/grades/my-grades');
      final list = (res.data['data'] as List<dynamic>)
          .map((e) => Grade.fromJson(e as Map<String, dynamic>))
          .toList();
      emit(GradesLoaded(list));
    } on Failure catch (e) {
      emit(GradeError(e.message));
    } catch (e) {
      emit(GradeError(e.toString()));
    }
  }

  Future<void> fetchCourseGPA(String courseId) async {
    try {
      final res = await _api.get('/grades/course/$courseId/gpa');
      final gpa = (res.data['data']?['gpa'] as num?)?.toDouble();
      emit(GPALoaded(gpa));
    } catch (_) {
      // ignore
    }
  }
}
