import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import 'presentation/blocs/auth/auth_cubit.dart';
import 'presentation/blocs/course/course_cubit.dart';
import 'presentation/blocs/enrollment/enrollment_cubit.dart';
import 'presentation/blocs/notification/notification_cubit.dart';
import 'presentation/blocs/quiz/quiz_cubit.dart';
import 'presentation/blocs/assignment/assignment_cubit.dart';
import 'presentation/blocs/grade/grade_cubit.dart';
import 'presentation/router/app_router.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const ELMSApp());
}

class ELMSApp extends StatelessWidget {
  const ELMSApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider(create: (_) => AuthCubit()..init()),
        BlocProvider(create: (_) => CourseCubit()),
        BlocProvider(create: (_) => EnrollmentCubit()),
        BlocProvider(create: (_) => NotificationCubit()),
        BlocProvider(create: (_) => QuizCubit()),
        BlocProvider(create: (_) => AssignmentCubit()),
        BlocProvider(create: (_) => GradeCubit()),
      ],
      child: Builder(
        builder: (context) {
          final authCubit = context.read<AuthCubit>();
          final router = AppRouter.router(authCubit);

          return MaterialApp.router(
            title: 'ELMS',
            debugShowCheckedModeBanner: false,
            theme: ThemeData(
              colorScheme: ColorScheme.fromSeed(
                seedColor: const Color(0xFF2563EB),
                brightness: Brightness.light,
              ),
              useMaterial3: true,
              appBarTheme: const AppBarTheme(
                centerTitle: true,
                elevation: 0,
              ),
              cardTheme: CardThemeData(
                elevation: 1,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              inputDecorationTheme: InputDecorationTheme(
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              ),
              filledButtonTheme: FilledButtonThemeData(
                style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
              ),
            ),
            routerConfig: router,
          );
        },
      ),
    );
  }
}
