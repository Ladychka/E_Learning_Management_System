import 'package:equatable/equatable.dart';

class Grade extends Equatable {
  final String id;
  final String studentId;
  final String courseId;
  final String? assignmentId;
  final String? quizId;
  final int points;
  final int maxPoints;
  final int percentage;
  final String? letterGrade;
  final String passFail;
  final String? feedback;
  final bool isPublished;
  final DateTime? publishedAt;
  final DateTime createdAt;

  const Grade({
    required this.id,
    required this.studentId,
    required this.courseId,
    this.assignmentId,
    this.quizId,
    required this.points,
    required this.maxPoints,
    required this.percentage,
    this.letterGrade,
    required this.passFail,
    this.feedback,
    required this.isPublished,
    this.publishedAt,
    required this.createdAt,
  });

  factory Grade.fromJson(Map<String, dynamic> json) {
    return Grade(
      id: json['id'] as String? ?? '',
      studentId: json['studentId'] as String? ?? '',
      courseId: json['courseId'] as String? ?? '',
      assignmentId: json['assignmentId'] as String?,
      quizId: json['quizId'] as String?,
      points: int.tryParse(json['points'].toString()) ?? 0,
      maxPoints: int.tryParse(json['maxPoints'].toString()) ?? 100,
      percentage: int.tryParse(json['percentage'].toString()) ?? 0,
      letterGrade: json['letterGrade'] as String?,
      passFail: json['passFail'] as String? ?? 'fail',
      feedback: json['feedback'] as String?,
      isPublished: json['isPublished'] as bool? ?? false,
      publishedAt: json['publishedAt'] != null
          ? DateTime.tryParse(json['publishedAt'].toString())
          : null,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  bool get isPass => passFail == 'pass';
  String get scoreText => '$points / $maxPoints ($percentage%)';

  @override
  List<Object?> get props => [id, studentId, courseId, points, percentage];
}
