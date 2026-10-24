import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/errors.dart';
import '../../../data/models/notification_model.dart';
import '../../../data/services/api_service.dart';

part 'notification_state.dart';

class NotificationCubit extends Cubit<NotificationState> {
  final ApiService _api = ApiService();

  NotificationCubit() : super(const NotificationInitial());

  Future<void> fetchNotifications() async {
    emit(const NotificationLoading());
    try {
      final res = await _api.get('/notifications/my');
      final list = (res.data['data'] as List<dynamic>)
          .map((e) => AppNotification.fromJson(e as Map<String, dynamic>))
          .toList();
      emit(NotificationsLoaded(list));
    } on Failure catch (e) {
      emit(NotificationError(e.message));
    } catch (e) {
      emit(NotificationError(e.toString()));
    }
  }

  Future<void> markAsRead(String id) async {
    try {
      await _api.patch('/notifications/$id/read');
      if (state is NotificationsLoaded) {
        final current = (state as NotificationsLoaded).notifications;
        final updated = current.map((n) {
          if (n.id == id) {
            return AppNotification(
              id: n.id,
              userId: n.userId,
              type: n.type,
              title: n.title,
              body: n.body,
              metadata: n.metadata,
              isRead: true,
              createdAt: n.createdAt,
            );
          }
          return n;
        }).toList();
        emit(NotificationsLoaded(updated));
      }
    } catch (_) {
      // ignore
    }
  }

  Future<void> markAllAsRead() async {
    try {
      await _api.patch('/notifications/read-all');
      if (state is NotificationsLoaded) {
        final current = (state as NotificationsLoaded).notifications;
        final updated = current
            .map((n) => AppNotification(
                  id: n.id,
                  userId: n.userId,
                  type: n.type,
                  title: n.title,
                  body: n.body,
                  metadata: n.metadata,
                  isRead: true,
                  createdAt: n.createdAt,
                ))
            .toList();
        emit(NotificationsLoaded(updated));
      }
    } catch (_) {
      // ignore
    }
  }

  Future<int> fetchUnreadCount() async {
    try {
      final res = await _api.get('/notifications/unread-count');
      final raw = res.data['data']?['count'];
      if (raw is int) return raw;
      if (raw is String) return int.tryParse(raw) ?? 0;
      return 0;
    } catch (_) {
      return 0;
    }
  }

  int get unreadCount {
    if (state is NotificationsLoaded) {
      return (state as NotificationsLoaded)
          .notifications
          .where((n) => !n.isRead)
          .length;
    }
    return 0;
  }
}
