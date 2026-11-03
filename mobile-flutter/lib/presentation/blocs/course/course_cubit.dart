import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/errors.dart';
import '../../../data/models/course_model.dart';
import '../../../data/models/module_model.dart';
import '../../../data/services/api_service.dart';

part 'course_state.dart';

class CourseCubit extends Cubit<CourseState> {
  final ApiService _api = ApiService();

  CourseCubit() : super(const CourseInitial());

  Future<void> fetchCourses({Map<String, String>? params}) async {
    emit(const CourseLoading());
    try {
      final res = await _api.get('/courses', queryParameters: {
        ...?params,
        'limit': '50',
      });
      final list = (res.data['data'] as List<dynamic>)
          .map((e) => Course.fromJson(e as Map<String, dynamic>))
          .toList();
      emit(CoursesLoaded(list));
    } on Failure catch (e) {
      emit(CourseError(e.message));
    } catch (e) {
      emit(CourseError(e.toString()));
    }
  }

  Future<void> fetchCourseDetail(String courseId) async {
    emit(const CourseLoading());
    try {
      final res = await _api.get('/courses/$courseId');
      final course = Course.fromJson(res.data['data'] as Map<String, dynamic>);
      emit(CourseDetailLoaded(course));
    } on Failure catch (e) {
      emit(CourseError(e.message));
    } catch (e) {
      emit(CourseError(e.toString()));
    }
  }

  Future<void> fetchModules(String courseId) async {
    emit(const CourseLoading());
    try {
      final res = await _api.get('/courses/$courseId/modules');
      final list = (res.data['data'] as List<dynamic>)
          .map((e) => CourseModule.fromJson(e as Map<String, dynamic>))
          .toList();
      emit(ModulesLoaded(list));
    } on Failure catch (e) {
      emit(CourseError(e.message));
    } catch (e) {
      emit(CourseError(e.toString()));
    }
  }
}
