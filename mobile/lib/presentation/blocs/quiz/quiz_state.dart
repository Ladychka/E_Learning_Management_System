part of 'quiz_cubit.dart';

abstract class QuizState extends Equatable {
  const QuizState();

  @override
  List<Object?> get props => [];
}

class QuizInitial extends QuizState {
  const QuizInitial();
}

class QuizLoading extends QuizState {
  const QuizLoading();
}

class QuizLoaded extends QuizState {
  final Quiz quiz;
  const QuizLoaded(this.quiz);

  @override
  List<Object?> get props => [quiz];
}

class QuizAttemptInProgress extends QuizState {
  final QuizAttempt attempt;
  final List<Question> questions;
  final Map<String, String> answers;
  final int elapsedSeconds;

  const QuizAttemptInProgress(
    this.attempt,
    this.questions,
    this.answers, {
    this.elapsedSeconds = 0,
  });

  int get remainingSeconds {
    if (attempt.timeLimit == null) return -1;
    final total = attempt.timeLimit! * 60;
    return total - elapsedSeconds;
  }

  String get formattedTime {
    if (attempt.timeLimit == null) return '';
    final remaining = remainingSeconds;
    final minutes = remaining ~/ 60;
    final seconds = remaining % 60;
    return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }

  bool get isTimeLow => attempt.timeLimit != null && remainingSeconds <= 60;

  @override
  List<Object?> get props => [attempt, questions, answers, elapsedSeconds];
}

class QuizAttemptCompleted extends QuizState {
  final QuizAttempt attempt;
  const QuizAttemptCompleted(this.attempt);

  @override
  List<Object?> get props => [attempt];
}

class QuizAttemptsList extends QuizState {
  final List<QuizAttempt> attempts;
  const QuizAttemptsList(this.attempts);

  @override
  List<Object?> get props => [attempts];
}

class QuizError extends QuizState {
  final String message;
  const QuizError(this.message);

  @override
  List<Object?> get props => [message];
}
