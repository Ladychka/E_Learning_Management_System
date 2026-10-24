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
      body: json['body'] as String?,
      metadata: json['metadata'] as Map<String, dynamic>?,
      isRead: json['isRead'] as bool? ?? false,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  IconData get iconData {
    switch (type) {
      case 'enrollment':
        return Icons.school;
      case 'payment':
        return Icons.payment;
      case 'grade':
        return Icons.emoji_events;
      case 'announcement':
        return Icons.campaign;
      case 'assignment':
        return Icons.assignment;
      case 'quiz':
        return Icons.quiz;
      default:
        return Icons.notifications;
    }
  }

  Color get iconColor {
    switch (type) {
      case 'enrollment':
        return Colors.blue;
      case 'payment':
        return Colors.green;
      case 'grade':
        return Colors.amber;
      case 'announcement':
        return Colors.orange;
      case 'assignment':
        return Colors.purple;
      case 'quiz':
        return Colors.teal;
      default:
        return Colors.grey;
    }
  }

  @override
  List<Object?> get props => [id, userId, type, title, isRead];
}
