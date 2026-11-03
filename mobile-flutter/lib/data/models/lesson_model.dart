import 'package:equatable/equatable.dart';

class Lesson extends Equatable {
  final String id;
  final String moduleId;
  final String title;
  final String? description;
  final String contentType;
  final String? contentUrl;
  final int? duration;
  final bool isPublished;
  final bool isPreview;
  final int sortOrder;
  final int? dripDays;

  const Lesson({
    required this.id,
    required this.moduleId,
    required this.title,
    this.description,
    required this.contentType,
    this.contentUrl,
    this.duration,
    required this.isPublished,
    required this.isPreview,
    required this.sortOrder,
    this.dripDays,
  });

  factory Lesson.fromJson(Map<String, dynamic> json) {
    return Lesson(
      id: json['id'] as String? ?? '',
      moduleId: json['moduleId'] as String? ?? '',
      title: json['title'] as String? ?? 'Untitled Lesson',
      description: json['description'] as String?,
      contentType: json['contentType'] as String? ?? 'text',
      contentUrl: json['contentUrl'] as String?,
      duration: int.tryParse(json['duration'].toString()),
      isPublished: json['isPublished'] as bool? ?? false,
      isPreview: json['isPreview'] as bool? ?? false,
      sortOrder: int.tryParse(json['sortOrder'].toString()) ?? 0,
      dripDays: int.tryParse(json['dripDays'].toString()),
    );
  }

  bool get isVideo => contentType == 'video';
  bool get isPdf => contentType == 'pdf';
  bool get isText => contentType == 'text';
  bool get isQuiz => contentType == 'quiz';

  @override
  List<Object?> get props => [id, title, contentType];
}
