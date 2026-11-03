import 'package:equatable/equatable.dart';

import 'lesson_model.dart';

class CourseModule extends Equatable {
  final String id;
  final String courseId;
  final String title;
  final String? description;
  final int sortOrder;
  final bool isPublished;
  final List<Lesson> lessons;

  const CourseModule({
    required this.id,
    required this.courseId,
    required this.title,
    this.description,
    required this.sortOrder,
    required this.isPublished,
    required this.lessons,
  });

  factory CourseModule.fromJson(Map<String, dynamic> json) {
    return CourseModule(
      id: json['id'] as String? ?? '',
      courseId: json['courseId'] as String? ?? '',
      title: json['title'] as String? ?? 'Untitled Module',
      description: json['description'] as String?,
      sortOrder: int.tryParse(json['sortOrder'].toString()) ?? 0,
      isPublished: json['isPublished'] as bool? ?? false,
      lessons: (json['lessons'] as List<dynamic>? ?? [])
          .map((e) => Lesson.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  @override
  List<Object?> get props => [id, title, sortOrder];
}
