import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/errors.dart';
import '../../../data/models/assignment_model.dart';
import '../../../data/services/api_service.dart';

part 'assignment_state.dart';

class AssignmentCubit extends Cubit<AssignmentState> {
  final ApiService _api = ApiService();

  AssignmentCubit() : super(const AssignmentInitial());

  Future<void> fetchAssignments({String? courseId}) async {
    emit(const AssignmentLoading());
    try {
      final res = await _api.get('/assignments', queryParameters: {
        if (courseId != null) 'courseId': courseId,
        'limit': '50',
      });
      final list = (res.data['data'] as List<dynamic>)
          .map((e) => Assignment.fromJson(e as Map<String, dynamic>))
          .toList();
      emit(AssignmentsLoaded(list));
    } on Failure catch (e) {
      emit(AssignmentError(e.message));
    } catch (e) {
      emit(AssignmentError(e.toString()));
    }
  }

  Future<void> fetchAssignmentDetail(String id) async {
    emit(const AssignmentLoading());
    try {
      final res = await _api.get('/assignments/$id');
      final assignment = Assignment.fromJson(
        res.data['data'] as Map<String, dynamic>,
      );
      emit(AssignmentDetailLoaded(assignment));
    } on Failure catch (e) {
      emit(AssignmentError(e.message));
    } catch (e) {
      emit(AssignmentError(e.toString()));
    }
  }

  Future<void> submitAssignment({
    required String assignmentId,
    String? content,
    List<String>? fileUrls,
  }) async {
    emit(const AssignmentLoading());
    try {
      await _api.post('/assignments/$assignmentId/submit', data: {
        if (content != null) 'content': content,
        if (fileUrls != null && fileUrls.isNotEmpty) 'fileUrls': fileUrls,
      });
      await fetchAssignmentDetail(assignmentId);
    } on Failure catch (e) {
      emit(AssignmentError(e.message));
    } catch (e) {
      emit(AssignmentError(e.toString()));
    }
  }
}
