import 'package:flutter/material.dart';
import 'package:equatable/equatable.dart';

class AppNotification extends Equatable {
  final String id;
  final String userId;
  final String type;
  final String title;
  final String? body;
  final Map<String, dynamic>? metadata;
  final bool isRead;
  final DateTime createdAt;

  const AppNotification({
    required this.id,
    required this.userId,
    required this.type,
    required this.title,
    this.body,
    this.metadata,
    required this.isRead,
    required this.createdAt,
  });

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    return AppNotification(
      id: json['id'] as String? ?? '',
      userId: json['userId'] as String? ?? '',
      type: json['type'] as String? ?? 'general',
      title: json['title'] as String? ?? 'Notification',
      body: (json['message'] ?? json['body']) as String?,
      metadata: json['metadata'] is Map<String, dynamic>
          ? json['metadata'] as Map<String, dynamic>
          : null,
      isRead: json['isRead'] as bool? ?? false,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  IconData get iconData {
    final normalized = type.toLowerCase();
    if (normalized.contains('enrollment')) return Icons.school;
    if (normalized.contains('payment')) return Icons.payment;
    if (normalized.contains('grade') || normalized.contains('appeal')) {
      return Icons.emoji_events;
    }
    if (normalized.contains('announcement')) return Icons.campaign;
    if (normalized.contains('assignment')) return Icons.assignment;
    if (normalized.contains('quiz')) return Icons.quiz;
    return Icons.notifications;
  }

  Color get iconColor {
    final normalized = type.toLowerCase();
    if (normalized.contains('enrollment')) return Colors.blue;
    if (normalized.contains('payment')) return Colors.green;
    if (normalized.contains('grade') || normalized.contains('appeal')) {
      return Colors.amber;
    }
    if (normalized.contains('announcement')) return Colors.orange;
    if (normalized.contains('assignment')) return Colors.purple;
    if (normalized.contains('quiz')) return Colors.teal;
    return Colors.grey;
  }

  @override
  List<Object?> get props => [id, userId, type, title, isRead];
}
