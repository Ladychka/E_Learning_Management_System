import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../blocs/auth/auth_cubit.dart';
import '../blocs/notification/notification_cubit.dart';

class ShellScaffold extends StatelessWidget {
  final Widget child;
  const ShellScaffold({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    final user = context.select(
      (AuthCubit cubit) =>
          cubit.state is AuthAuthenticated
              ? (cubit.state as AuthAuthenticated).user
              : null,
    );

    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: _calcIndex(context),
        onDestinationSelected: (index) {
          switch (index) {
            case 0:
              context.go('/');
            case 1:
              context.go('/courses');
            case 2:
              context.go('/enrollments');
            case 3:
              context.go('/profile');
          }
        },
        destinations: [
          const NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard),
            label: 'Dashboard',
          ),
          const NavigationDestination(
            icon: Icon(Icons.school_outlined),
            selectedIcon: Icon(Icons.school),
            label: 'Courses',
          ),
          const NavigationDestination(
            icon: Icon(Icons.menu_book_outlined),
            selectedIcon: Icon(Icons.menu_book),
            label: 'Enrollments',
          ),
          NavigationDestination(
            icon: BlocBuilder<NotificationCubit, NotificationState>(
              builder: (context, state) {
                int unreadCount = 0;
                if (state is NotificationsLoaded) {
                  unreadCount = state.notifications.where((n) => !n.isRead).length;
                }
                return Badge(
                  isLabelVisible: unreadCount > 0,
                  label: Text(unreadCount.toString()),
                  child: const Icon(Icons.person_outline),
                );
              },
            ),
            selectedIcon: const Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
      floatingActionButton: user?.isInstructor ?? false
          ? FloatingActionButton.small(
              onPressed: () {
                // TODO: instructor quick action
              },
              child: const Icon(Icons.add),
            )
          : null,
    );
  }

  int _calcIndex(BuildContext context) {
    final loc = GoRouterState.of(context).matchedLocation;
    if (loc.startsWith('/courses')) return 1;
    if (loc.startsWith('/lessons')) return 1; // lessons are inside courses
    if (loc.startsWith('/enrollments')) return 2;
    if (loc.startsWith('/profile')) return 3;
    return 0;
  }
}
