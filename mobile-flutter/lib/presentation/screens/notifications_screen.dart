import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';

import '../blocs/notification/notification_cubit.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  @override
  void initState() {
    super.initState();
    context.read<NotificationCubit>().fetchNotifications();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          TextButton(
            onPressed: () {
              context.read<NotificationCubit>().markAllAsRead();
            },
            child: const Text('Mark all read'),
          ),
        ],
      ),
      body: BlocBuilder<NotificationCubit, NotificationState>(
        builder: (context, state) {
          if (state is NotificationLoading) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state is NotificationError) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(state.message),
                  const SizedBox(height: 8),
                  ElevatedButton(
                    onPressed: () =>
                        context.read<NotificationCubit>().fetchNotifications(),
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          }
          if (state is NotificationsLoaded) {
            final notifications = state.notifications;
            if (notifications.isEmpty) {
              return Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.notifications_off_outlined,
                        size: 64, color: Colors.grey[400]),
                    const SizedBox(height: 16),
                    Text(
                      'No notifications',
                      style: TextStyle(color: Colors.grey[600]),
                    ),
                  ],
                ),
              );
            }
            return RefreshIndicator(
              onRefresh: () => context.read<NotificationCubit>().fetchNotifications(),
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: notifications.length,
              itemBuilder: (_, index) {
                final n = notifications[index];
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  color: n.isRead ? null : Colors.blue[50],
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundColor: n.iconColor.withAlpha(26),
                      child: Icon(n.iconData, color: n.iconColor, size: 20),
                    ),
                    title: Text(
                      n.title,
                      style: TextStyle(
                        fontWeight:
                            n.isRead ? FontWeight.normal : FontWeight.bold,
                      ),
                    ),
                    subtitle: n.body != null
                        ? Text(
                            n.body!,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          )
                        : null,
                    trailing: Text(
                      DateFormat.MMMd().add_jm().format(n.createdAt),
                      style: TextStyle(fontSize: 11, color: Colors.grey[600]),
                    ),
                    onTap: () {
                      if (!n.isRead) {
                        context.read<NotificationCubit>().markAsRead(n.id);
                      }
                    },
                  ),
                );
              },
              ),
            );
          }
          return const SizedBox.shrink();
        },
      ),
    );
  }
}
