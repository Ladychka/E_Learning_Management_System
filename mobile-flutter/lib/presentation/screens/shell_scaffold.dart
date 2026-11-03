import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../blocs/auth/auth_cubit.dart';
import '../blocs/notification/notification_cubit.dart';
import '../blocs/locale/locale_cubit.dart';
import '../../core/localization.dart';

class ShellScaffold extends StatelessWidget {
  final Widget child;
  const ShellScaffold({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    final langCode = context.watch<LocaleCubit>().state.locale.languageCode;
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
              context.go('/finance-tools');
            case 3:
              context.go('/enrollments');
            case 4:
              context.go('/profile');
          }
        },
        destinations: [
          NavigationDestination(
            icon: const Icon(Icons.dashboard_outlined),
            selectedIcon: const Icon(Icons.dashboard),
            label: AppStrings.get('nav_dashboard', langCode),
          ),
          NavigationDestination(
            icon: const Icon(Icons.school_outlined),
            selectedIcon: const Icon(Icons.school),
            label: AppStrings.get('nav_courses', langCode),
          ),
          NavigationDestination(
            icon: const Icon(Icons.account_balance_wallet_outlined),
            selectedIcon: const Icon(Icons.account_balance_wallet),
            label: AppStrings.get('nav_finance_hub', langCode),
          ),
          NavigationDestination(
            icon: const Icon(Icons.menu_book_outlined),
            selectedIcon: const Icon(Icons.menu_book),
            label: AppStrings.get('nav_enrollments', langCode),
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
            label: AppStrings.get('nav_profile', langCode),
          ),
        ],
      ),
      floatingActionButton: user?.isInstructor ?? false
          ? FloatingActionButton.small(
              onPressed: () {
                // instructor quick action
              },
              child: const Icon(Icons.add),
            )
          : null,
    );
  }

  int _calcIndex(BuildContext context) {
    final loc = GoRouterState.of(context).matchedLocation;
    if (loc.startsWith('/courses')) return 1;
    if (loc.startsWith('/lessons')) return 1;
    if (loc.startsWith('/finance-tools')) return 2;
    if (loc.startsWith('/enrollments')) return 3;
    if (loc.startsWith('/profile')) return 4;
    return 0;
  }
}
