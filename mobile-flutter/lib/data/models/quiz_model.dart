import 'package:equatable/equatable.dart';

class Quiz extends Equatable {
  final String id;
  final String lessonId;
  final String title;
  final String? description;
  final int? timeLimit; // minutes
  final int? maxAttempts;
  final int? passingScore;
  final bool isPublished;
  final List<Question> questions;

  const Quiz({
    required this.id,
    required this.lessonId,
    required this.title,
    this.description,
    this.timeLimit,
    this.maxAttempts,
    this.passingScore,
    required this.isPublished,
    required this.questions,
  });

  factory Quiz.fromJson(Map<String, dynamic> json) {
    return Quiz(
      id: json['id'] as String? ?? '',
      lessonId: json['lessonId'] as String? ?? '',
      title: json['title'] as String? ?? 'Untitled Quiz',
      description: json['description'] as String?,
      timeLimit: int.tryParse(json['timeLimit'].toString()),
      maxAttempts: int.tryParse(json['maxAttempts'].toString()),
      passingScore: int.tryParse(json['passingScore'].toString()),
      isPublished: json['isPublished'] as bool? ?? false,
      questions: (json['questions'] as List<dynamic>? ?? [])
          .map((e) => Question.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  @override
  List<Object?> get props => [id, lessonId, title];
}

class Question extends Equatable {
  final String id;
  final String quizId;
  final String question;
  final String type; // MCQ, TRUE_FALSE, SHORT_ANSWER
  final List<dynamic> options;
  final String? correctAnswer;
  final int points;
  final int sortOrder;

  const Question({
    required this.id,
    required this.quizId,
    required this.question,
    required this.type,
    required this.options,
    this.correctAnswer,
    required this.points,
    required this.sortOrder,
  });

  factory Question.fromJson(Map<String, dynamic> json) {
    return Question(
      id: json['id'] as String? ?? '',
      quizId: json['quizId'] as String? ?? '',
      question: json['question'] as String? ?? 'Question',
      type: json['type'] as String? ?? 'MCQ',
      options: json['options'] as List<dynamic>? ?? [],
      correctAnswer: json['correctAnswer'] as String?,
      points: int.tryParse(json['points'].toString()) ?? 1,
      sortOrder: int.tryParse(json['sortOrder'].toString()) ?? 0,
    );
  }

  bool get isMCQ => type == 'MCQ';
  bool get isTrueFalse => type == 'TRUE_FALSE';
  bool get isShortAnswer => type == 'SHORT_ANSWER';

  @override
  List<Object?> get props => [id, question, type];
}

class QuizAttempt extends Equatable {
  final String id;
  final String quizId;
  final String userId;
  final String status; // in_progress, completed, timed_out
  final int attemptNumber;
  final int? timeLimit;
  final DateTime startedAt;
  final DateTime? submittedAt;
  final int? score;
  final int? maxScore;
  final int? percentage;
  final List<QuizAnswer> answers;

  const QuizAttempt({
    required this.id,
    required this.quizId,
    required this.userId,
    required this.status,
    required this.attemptNumber,
    this.timeLimit,
    required this.startedAt,
    this.submittedAt,
    this.score,
    this.maxScore,
    this.percentage,
    required this.answers,
  });

  factory QuizAttempt.fromJson(Map<String, dynamic> json) {
    return QuizAttempt(
      id: json['id'] as String? ?? '',
      quizId: json['quizId'] as String? ?? '',
      userId: json['userId'] as String? ?? '',
      status: json['status'] as String? ?? 'in_progress',
      attemptNumber: int.tryParse(json['attemptNumber'].toString()) ?? 1,
      timeLimit: int.tryParse(json['timeLimit'].toString()),
      startedAt: json['startedAt'] != null
          ? DateTime.tryParse(json['startedAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
      submittedAt: json['submittedAt'] != null
          ? DateTime.tryParse(json['submittedAt'].toString())
          : null,
      score: int.tryParse(json['score'].toString()),
      maxScore: int.tryParse(json['maxScore'].toString()),
      percentage: int.tryParse(json['percentage'].toString()),
      answers: (json['answers'] as List<dynamic>? ?? [])
          .map((e) => QuizAnswer.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  bool get isInProgress => status == 'in_progress';
  bool get isCompleted => status == 'completed';
  bool get isTimedOut => status == 'timed_out';

  @override
  List<Object?> get props => [id, quizId, status, attemptNumber, score];
}

class QuizAnswer extends Equatable {
  final String id;
  final String attemptId;
  final String questionId;
  final String? answer;
  final bool? isCorrect;
  final int? pointsEarned;
  final Question? question;

  const QuizAnswer({
    required this.id,
    required this.attemptId,
    required this.questionId,
    this.answer,
    this.isCorrect,
    this.pointsEarned,
    this.question,
  });

  factory QuizAnswer.fromJson(Map<String, dynamic> json) {
    return QuizAnswer(
      id: json['id'] as String? ?? '',
      attemptId: json['attemptId'] as String? ?? '',
      questionId: json['questionId'] as String? ?? '',
      answer: json['answer'] as String?,
      isCorrect: json['isCorrect'] as bool?,
      pointsEarned: int.tryParse(json['pointsEarned'].toString()),
      question: json['question'] != null
          ? Question.fromJson(json['question'] as Map<String, dynamic>)
          : null,
    );
  }

  @override
  List<Object?> get props => [id, questionId, answer, isCorrect];
}
