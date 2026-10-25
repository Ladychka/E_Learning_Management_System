import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../blocs/auth/auth_cubit.dart';
import '../screens/login_screen.dart';
import '../screens/register_screen.dart';
import '../screens/dashboard_screen.dart';
import '../screens/courses_screen.dart';
import '../screens/course_detail_screen.dart';
import '../screens/lesson_player_screen.dart';
import '../screens/profile_screen.dart';
import '../screens/my_enrollments_screen.dart';
import '../screens/notifications_screen.dart';
import '../screens/payment_history_screen.dart';
import '../screens/edit_profile_screen.dart';
import '../screens/change_password_screen.dart';
import '../screens/quiz_take_screen.dart';
import '../screens/quiz_results_screen.dart';
import '../screens/assignment_detail_screen.dart';
import '../screens/grades_screen.dart';
import '../screens/checkout_screen.dart';
import '../screens/finance_hub_screen.dart';
import '../screens/shell_scaffold.dart';

class AppRouter {
  static GoRouter? _router;
  static AuthCubit? _lastAuthCubit;

  static GoRouter router(AuthCubit authCubit) {
    if (_router != null && _lastAuthCubit == authCubit) {
      return _router!;
    }
    _lastAuthCubit = authCubit;
    _router = GoRouter(
      initialLocation: '/',
      refreshListenable: _AuthRefreshListenable(authCubit),
      redirect: (context, state) {
        final authState = authCubit.state;
        final isAuth = authState is AuthAuthenticated;
        final isAuthRoute = state.matchedLocation == '/login' ||
            state.matchedLocation == '/register';

        if (!isAuth && !isAuthRoute) return '/login';
        if (isAuth && isAuthRoute) return '/';
        return null;
      },
      routes: [
        GoRoute(
          path: '/login',
          builder: (_, __) => const LoginScreen(),
        ),
        GoRoute(
          path: '/register',
          builder: (_, __) => const RegisterScreen(),
        ),
        ShellRoute(
          builder: (_, __, child) => ShellScaffold(child: child),
          routes: [
            GoRoute(
              path: '/',
              builder: (_, __) => const DashboardScreen(),
            ),
            GoRoute(
              path: '/courses',
              builder: (_, __) => const CoursesScreen(),
            ),
            GoRoute(
              path: '/courses/:id',
              builder: (_, state) => CourseDetailScreen(
                courseId: state.pathParameters['id']!,
              ),
            ),
            GoRoute(
              path: '/lessons/:id',
              builder: (_, state) => LessonPlayerScreen(
                lessonId: state.pathParameters['id']!,
              ),
            ),
            GoRoute(
              path: '/finance-tools',
              builder: (_, __) => const FinanceHubScreen(),
            ),
            GoRoute(
              path: '/enrollments',
              builder: (_, __) => const MyEnrollmentsScreen(),
            ),
            GoRoute(
              path: '/profile',
              builder: (_, __) => const ProfileScreen(),
            ),
          ],
        ),
        // Routes outside shell scaffold (pushed on top)
        GoRoute(
          path: '/notifications',
          builder: (_, __) => const NotificationsScreen(),
        ),
        GoRoute(
          path: '/payments/history',
          builder: (_, __) => const PaymentHistoryScreen(),
        ),
        GoRoute(
          path: '/profile/edit',
          builder: (_, __) => const EditProfileScreen(),
        ),
        GoRoute(
          path: '/profile/change-password',
          builder: (_, __) => const ChangePasswordScreen(),
        ),
        GoRoute(
          path: '/quiz-take/:lessonId/:quizId',
          builder: (_, state) => QuizTakeScreen(
            lessonId: state.pathParameters['lessonId']!,
            quizId: state.pathParameters['quizId']!,
          ),
        ),
        GoRoute(
          path: '/quiz-results/:attemptId',
          builder: (_, state) => QuizResultsScreen(
            attemptId: state.pathParameters['attemptId']!,
          ),
        ),
        GoRoute(
          path: '/assignments/:id',
          builder: (_, state) => AssignmentDetailScreen(
            assignmentId: state.pathParameters['id']!,
          ),
        ),
        GoRoute(
          path: '/grades',
          builder: (_, __) => const GradesScreen(),
        ),
        GoRoute(
          path: '/checkout/:courseId',
          builder: (_, state) {
            final courseId = state.pathParameters['courseId']!;
            final extra = state.extra as Map<String, dynamic>?;
            return CheckoutScreen(
              courseId: courseId,
              amount: (extra?['amount'] as num?)?.toDouble() ?? 0,
              currency: extra?['currency'] as String? ?? 'USD',
              courseTitle: extra?['title'] as String? ?? 'Course',
            );
          },
        ),
      ],
    );
    return _router!;
  }
}

class _AuthRefreshListenable extends ChangeNotifier {
  _AuthRefreshListenable(AuthCubit cubit) {
    cubit.stream.listen((_) => notifyListeners());
  }
}
