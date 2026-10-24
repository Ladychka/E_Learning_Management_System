import 'dart:async';

import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/errors.dart';
import '../../../data/models/quiz_model.dart';
import '../../../data/services/api_service.dart';

part 'quiz_state.dart';

class QuizCubit extends Cubit<QuizState> {
  final ApiService _api = ApiService();
  Timer? _timer;

  QuizCubit() : super(const QuizInitial());

  Future<void> fetchQuizByLesson(String lessonId) async {
    emit(const QuizLoading());
    try {
      final res = await _api.get('/lessons/$lessonId/quiz');
      final quiz = Quiz.fromJson(res.data['data'] as Map<String, dynamic>);
      emit(QuizLoaded(quiz));
    } on Failure catch (e) {
      emit(QuizError(e.message));
    } catch (e) {
      emit(QuizError(e.toString()));
    }
  }

  Future<void> startAttempt(String quizId) async {
    emit(const QuizLoading());
    try {
      final res = await _api.post('/quizzes/attempts', data: {
        'quizId': quizId,
      });
      final data = res.data['data'] as Map<String, dynamic>;
      final attempt = QuizAttempt.fromJson(data['attempt'] as Map<String, dynamic>);
      final questions = (data['questions'] as List<dynamic>)
          .map((e) => Question.fromJson(e as Map<String, dynamic>))
          .toList();
      emit(QuizAttemptInProgress(attempt, questions, const {}));
      _startTimer(attempt);
    } on Failure catch (e) {
      emit(QuizError(e.message));
    } catch (e) {
      emit(QuizError(e.toString()));
    }
  }

  void answerQuestion(String questionId, String answer) {
    final current = state;
    if (current is QuizAttemptInProgress) {
      final updated = Map<String, String>.from(current.answers);
      updated[questionId] = answer;
      emit(QuizAttemptInProgress(
        current.attempt,
        current.questions,
        updated,
        elapsedSeconds: current.elapsedSeconds,
      ));
    }
  }

  Future<void> submitAttempt(String attemptId) async {
    final current = state;
    if (current is! QuizAttemptInProgress) return;

    _timer?.cancel();
    emit(const QuizLoading());
    try {
      final answers = current.answers.entries.map((e) => {
        'questionId': e.key,
        'answer': e.value,
      }).toList();

      final res = await _api.post(
        '/quizzes/attempts/$attemptId/submit',
        data: {'answers': answers},
      );
      final attempt = QuizAttempt.fromJson(
        res.data['data'] as Map<String, dynamic>,
      );
      emit(QuizAttemptCompleted(attempt));
    } on Failure catch (e) {
      emit(QuizError(e.message));
    } catch (e) {
      emit(QuizError(e.toString()));
    }
  }

  Future<void> fetchResults(String attemptId) async {
    emit(const QuizLoading());
    try {
      final res = await _api.get('/quizzes/attempts/$attemptId/results');
      final attempt = QuizAttempt.fromJson(
        res.data['data'] as Map<String, dynamic>,
      );
      emit(QuizAttemptCompleted(attempt));
    } on Failure catch (e) {
      emit(QuizError(e.message));
    } catch (e) {
      emit(QuizError(e.toString()));
    }
  }

  void reset() {
    _timer?.cancel();
    emit(const QuizInitial());
  }

  Future<void> fetchMyAttempts(String quizId) async {
    try {
      final res = await _api.get('/quiz-attempts/my-attempts', queryParameters: {
        'quizId': quizId,
      });
      final list = (res.data['data'] as List<dynamic>)
          .map((e) => QuizAttempt.fromJson(e as Map<String, dynamic>))
          .toList();
      emit(QuizAttemptsList(list));
    } on Failure catch (e) {
      emit(QuizError(e.message));
    } catch (e) {
      emit(QuizError(e.toString()));
    }
  }

  void _startTimer(QuizAttempt attempt) {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      final current = state;
      if (current is QuizAttemptInProgress) {
        final newElapsed = current.elapsedSeconds + 1;
        if (attempt.timeLimit != null &&
            newElapsed >= attempt.timeLimit! * 60) {
          _timer?.cancel();
          submitAttempt(current.attempt.id);
          return;
        }
        emit(QuizAttemptInProgress(
          current.attempt,
          current.questions,
          current.answers,
          elapsedSeconds: newElapsed,
        ));
      }
    });
  }

  @override
  Future<void> close() {
    _timer?.cancel();
    return super.close();
  }
}
