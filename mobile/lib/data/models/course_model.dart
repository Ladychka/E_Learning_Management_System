import 'package:equatable/equatable.dart';

class Course extends Equatable {
  final String id;
  final String title;
  final String slug;
  final String? description;
  final String? shortDesc;
  final String? thumbnailUrl;
  final String status;
  final double? price;
  final String currency;
  final bool isFree;
  final String instructorId;
  final String? categoryId;
  final String? level;
  final int? duration;
  final String language;
  final List<dynamic> prerequisites;
  final List<dynamic> learningOutcomes;
  final List<dynamic> tags;
  final DateTime? publishedAt;
  final DateTime? scheduledAt;
  final DateTime createdAt;

  const Course({
    required this.id,
    required this.title,
    required this.slug,
    this.description,
    this.shortDesc,
    this.thumbnailUrl,
    required this.status,
    this.price,
    required this.currency,
    required this.isFree,
    required this.instructorId,
    this.categoryId,
    this.level,
    this.duration,
    required this.language,
    required this.prerequisites,
    required this.learningOutcomes,
    required this.tags,
    this.publishedAt,
    this.scheduledAt,
    required this.createdAt,
  });

  factory Course.fromJson(Map<String, dynamic> json) {
    return Course(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? 'Untitled',
      slug: json['slug'] as String? ?? '',
      description: json['description'] as String?,
      shortDesc: json['shortDesc'] as String?,
      thumbnailUrl: json['thumbnailUrl'] as String?,
      status: json['status'] as String? ?? 'DRAFT',
      price: json['price'] != null
          ? double.tryParse(json['price'].toString())
          : null,
      currency: json['currency'] as String? ?? 'USD',
      isFree: json['isFree'] as bool? ?? false,
      instructorId: json['instructorId'] as String? ?? '',
      categoryId: json['categoryId'] as String?,
      level: json['level'] as String?,
      duration: int.tryParse(json['duration'].toString()),
      language: json['language'] as String? ?? 'en',
      prerequisites: json['prerequisites'] as List<dynamic>? ?? [],
      learningOutcomes: json['learningOutcomes'] as List<dynamic>? ?? [],
      tags: json['tags'] as List<dynamic>? ?? [],
      publishedAt: json['publishedAt'] != null
          ? DateTime.tryParse(json['publishedAt'].toString())
          : null,
      scheduledAt: json['scheduledAt'] != null
          ? DateTime.tryParse(json['scheduledAt'].toString())
          : null,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  @override
  List<Object?> get props => [id, title, slug];
}
