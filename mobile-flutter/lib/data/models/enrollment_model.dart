import 'package:equatable/equatable.dart';

import 'course_model.dart';

class Enrollment extends Equatable {
  final String id;
  final String userId;
  final String courseId;
  final String status; // ACTIVE, COMPLETED, DROPPED, EXPIRED
  final double? progress;
  final DateTime enrolledAt;
  final DateTime? completedAt;
  final DateTime? expiresAt;
  final Course? course;

  const Enrollment({
    required this.id,
    required this.userId,
    required this.courseId,
    required this.status,
    this.progress,
    required this.enrolledAt,
    this.completedAt,
    this.expiresAt,
    this.course,
  });

  factory Enrollment.fromJson(Map<String, dynamic> json) {
    // The API returns lowercase statuses and an integer progressPercent.
    // Normalize both so the UI getters work for real responses.
    final status = (json['status'] ?? 'active').toString().toUpperCase();
    final rawProgressPercent = num.tryParse(
      (json['progressPercent'] ?? '').toString(),
    );
    final rawProgress = num.tryParse((json['progress'] ?? '').toString());
    final progress = rawProgressPercent != null
        ? rawProgressPercent.toDouble() / 100.0
        : rawProgress?.toDouble();

    return Enrollment(
      id: json['id'] as String? ?? '',
      userId: json['userId'] as String? ?? '',
      courseId: json['courseId'] as String? ?? '',
      status: status,
      progress: progress,
      enrolledAt: json['enrolledAt'] != null
          ? DateTime.tryParse(json['enrolledAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
      completedAt: json['completedAt'] != null
          ? DateTime.tryParse(json['completedAt'].toString())
          : null,
      expiresAt: json['expiresAt'] != null
          ? DateTime.tryParse(json['expiresAt'].toString())
          : null,
      course: json['course'] != null
          ? Course.fromJson(json['course'] as Map<String, dynamic>)
          : null,
    );
  }

  bool get isActive => status == 'ACTIVE';
  bool get isCompleted => status == 'COMPLETED';
  bool get isExpired => status == 'EXPIRED';

  double get progressPercent => progress ?? 0.0;

  @override
  List<Object?> get props => [id, userId, courseId, status, progress];
}
