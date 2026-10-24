import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../blocs/auth/auth_cubit.dart';
import '../blocs/enrollment/enrollment_cubit.dart';
import '../blocs/notification/notification_cubit.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  @override
  void initState() {
    super.initState();
    context.read<EnrollmentCubit>().fetchMyEnrollments();
    context.read<NotificationCubit>().fetchNotifications();
  }

  @override
  Widget build(BuildContext context) {
    final user = context.select(
      (AuthCubit cubit) =>
          cubit.state is AuthAuthenticated
              ? (cubit.state as AuthAuthenticated).user
              : null,
    );

    return Scaffold(
      appBar: AppBar(
        title: Text('Welcome, ${user?.firstName ?? 'Student'}'),
        actions: [
          BlocBuilder<NotificationCubit, NotificationState>(
            builder: (context, state) {
              int unreadCount = 0;
              if (state is NotificationsLoaded) {
                unreadCount = state.notifications.where((n) => !n.isRead).length;
              }
              return IconButton(
                icon: Badge(
                  isLabelVisible: unreadCount > 0,
                  label: Text(unreadCount.toString()),
                  child: const Icon(Icons.notifications_outlined),
                ),
                onPressed: () => context.push('/notifications'),
              );
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Stats cards
            BlocBuilder<EnrollmentCubit, EnrollmentState>(
              builder: (context, state) {
                int activeCount = 0;
                int completedCount = 0;
                if (state is EnrollmentsLoaded) {
                  activeCount = state.enrollments.where((e) => e.isActive).length;
                  completedCount =
                      state.enrollments.where((e) => e.isCompleted).length;
                }
                return Row(
                  children: [
                    _buildStatCard(
                      context,
                      icon: Icons.menu_book,
                      label: 'Courses',
                      value: activeCount.toString(),
                      color: const Color(0xFF2563EB),
                    ),
                    const SizedBox(width: 12),
                    _buildStatCard(
                      context,
                      icon: Icons.emoji_events,
                      label: 'Completed',
                      value: completedCount.toString(),
                      color: const Color(0xFF059669),
                    ),
                  ],
                );
              },
            ),
            const SizedBox(height: 24),
            Text(
              'Quick Actions',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 12),
            Card(
              child: ListTile(
                leading: const Icon(Icons.explore, color: Color(0xFF2563EB)),
                title: const Text('Browse Courses'),
                subtitle: const Text('Discover new learning paths'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.go('/courses'),
              ),
            ),
            const SizedBox(height: 8),
            Card(
              child: ListTile(
                leading:
                    const Icon(Icons.school_outlined, color: Color(0xFF059669)),
                title: const Text('My Enrollments'),
                subtitle: const Text('Track your learning progress'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.go('/enrollments'),
              ),
            ),
            if (user?.isInstructor ?? false) ...[
              const SizedBox(height: 8),
              Card(
                child: ListTile(
                  leading:
                      const Icon(Icons.add_circle, color: Color(0xFF059669)),
                  title: const Text('Manage Courses'),
                  subtitle: const Text('Edit your course content'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => context.go('/courses'),
                ),
              ),
            ],
            const SizedBox(height: 24),
            Text(
              'Continue Learning',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 12),
            BlocBuilder<EnrollmentCubit, EnrollmentState>(
              builder: (context, state) {
                if (state is EnrollmentsLoaded) {
                  final inProgress = state.enrollments
                      .where((e) =>
                          e.isActive &&
                          (e.progress ?? 0) < 1.0 &&
                          e.course != null)
                      .toList();
                  if (inProgress.isEmpty) {
                    return Center(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 32),
                        child: Column(
                          children: [
                            Icon(Icons.menu_book_outlined,
                                size: 48, color: Colors.grey[400]),
                            const SizedBox(height: 8),
                            Text(
                              'No enrollments yet',
                              style: TextStyle(color: Colors.grey[600]),
                            ),
                            const SizedBox(height: 8),
                            FilledButton.tonal(
                              onPressed: () => context.go('/courses'),
                              child: const Text('Browse Courses'),
                            ),
                          ],
                        ),
                      ),
                    );
                  }
                  return Column(
                    children: inProgress.take(3).map((e) {
                      final course = e.course!;
                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: InkWell(
                          onTap: () => context.go('/courses/${course.id}'),
                          borderRadius: BorderRadius.circular(12),
                          child: Padding(
                            padding: const EdgeInsets.all(12),
                            child: Row(
                              children: [
                                if (course.thumbnailUrl != null)
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(8),
                                    child: Image.network(
                                      course.thumbnailUrl!,
                                      width: 64,
                                      height: 64,
                                      fit: BoxFit.cover,
                                      errorBuilder: (_, __, ___) => Container(
                                        width: 64,
                                        height: 64,
                                        color: Colors.grey[200],
                                        child: const Icon(Icons.image),
                                      ),
                                    ),
                                  )
                                else
                                  Container(
                                    width: 64,
                                    height: 64,
                                    decoration: BoxDecoration(
                                      color: Colors.grey[200],
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: const Icon(Icons.image),
                                  ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        course.title,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      LinearProgressIndicator(
                                        value: e.progressPercent,
                                        backgroundColor: Colors.grey[200],
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        '${(e.progressPercent * 100).toStringAsFixed(0)}% complete',
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: Colors.grey[600],
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  );
                }
                return const SizedBox.shrink();
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatCard(
    BuildContext context, {
    required IconData icon,
    required String label,
    required String value,
    required Color color,
  }) {
    return Expanded(
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, color: color),
              const SizedBox(height: 8),
              Text(
                value,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
              ),
              Text(
                label,
                style: TextStyle(color: Colors.grey[600], fontSize: 12),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
