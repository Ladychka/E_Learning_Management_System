import 'package:equatable/equatable.dart';

class Assignment extends Equatable {
  final String id;
  final String courseId;
  final String title;
  final String? description;
  final String? instructions;
  final int maxPoints;
  final DateTime? dueDate;
  final bool allowLate;
  final bool isPublished;
  final DateTime createdAt;
  final List<dynamic> attachments;
  final List<Submission> submissions;

  const Assignment({
    required this.id,
    required this.courseId,
    required this.title,
    this.description,
    this.instructions,
    required this.maxPoints,
    this.dueDate,
    required this.allowLate,
    required this.isPublished,
    required this.createdAt,
    required this.attachments,
    required this.submissions,
  });

  factory Assignment.fromJson(Map<String, dynamic> json) {
    return Assignment(
      id: json['id'] as String? ?? '',
      courseId: json['courseId'] as String? ?? '',
      title: json['title'] as String? ?? 'Untitled Assignment',
      description: json['description'] as String?,
      instructions: json['instructions'] as String?,
      maxPoints: int.tryParse(json['maxPoints'].toString()) ?? 100,
      dueDate: json['dueDate'] != null
          ? DateTime.tryParse(json['dueDate'].toString())
          : null,
      allowLate: json['allowLate'] as bool? ?? false,
      isPublished: json['isPublished'] as bool? ?? false,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
      attachments: json['attachments'] as List<dynamic>? ?? [],
      submissions: (json['submissions'] as List<dynamic>? ?? [])
          .map((e) => Submission.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  bool get isOverdue {
    if (dueDate == null) return false;
    return DateTime.now().isAfter(dueDate!);
  }

  bool get hasSubmitted => submissions.isNotEmpty;
  Submission? get latestSubmission => submissions.isNotEmpty ? submissions.first : null;

  @override
  List<Object?> get props => [id, courseId, title, maxPoints];
}

class Submission extends Equatable {
  final String id;
  final String assignmentId;
  final String studentId;
  final String? content;
  final List<dynamic> fileUrls;
  final DateTime submittedAt;
  final bool isLate;
  final int? points;
  final String? feedback;

  const Submission({
    required this.id,
    required this.assignmentId,
    required this.studentId,
    this.content,
    required this.fileUrls,
    required this.submittedAt,
    required this.isLate,
    this.points,
    this.feedback,
  });

  factory Submission.fromJson(Map<String, dynamic> json) {
    return Submission(
      id: json['id'] as String? ?? '',
      assignmentId: json['assignmentId'] as String? ?? '',
      studentId: json['studentId'] as String? ?? '',
      content: json['content'] as String?,
      fileUrls: json['fileUrls'] as List<dynamic>? ?? [],
      submittedAt: json['submittedAt'] != null
          ? DateTime.tryParse(json['submittedAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
      isLate: json['isLate'] as bool? ?? false,
      points: int.tryParse(json['points'].toString()),
      feedback: json['feedback'] as String?,
    );
  }

  @override
  List<Object?> get props => [id, assignmentId, studentId, points];
}
