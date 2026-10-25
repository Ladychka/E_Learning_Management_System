import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../blocs/course/course_cubit.dart';

class CoursesScreen extends StatefulWidget {
  const CoursesScreen({super.key});

  @override
  State<CoursesScreen> createState() => _CoursesScreenState();
}

class _CoursesScreenState extends State<CoursesScreen> {
  final _searchCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    context.read<CourseCubit>().fetchCourses();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  void _search() {
    final query = _searchCtrl.text.trim();
    context.read<CourseCubit>().fetchCourses(
          params: query.isNotEmpty ? {'search': query} : null,
        );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Browse Courses'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(64),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: TextField(
              controller: _searchCtrl,
              textInputAction: TextInputAction.search,
              onSubmitted: (_) => _search(),
              decoration: InputDecoration(
                hintText: 'Search courses...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: IconButton(
                  icon: const Icon(Icons.arrow_forward),
                  onPressed: _search,
                ),
              ),
            ),
          ),
        ),
      ),
      body: BlocBuilder<CourseCubit, CourseState>(
        builder: (context, state) {
          if (state is CourseLoading) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state is CourseError) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(state.message),
                  const SizedBox(height: 8),
                  ElevatedButton(
                    onPressed: () =>
                        context.read<CourseCubit>().fetchCourses(),
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          }
          if (state is CoursesLoaded) {
            final courses = state.courses;
            if (courses.isEmpty) {
              return const Center(child: Text('No courses found'));
            }
            return RefreshIndicator(
              onRefresh: () => context.read<CourseCubit>().fetchCourses(),
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: courses.length,
              itemBuilder: (_, index) {
                final course = courses[index];
                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  child: InkWell(
                    onTap: () => context.go('/courses/${course.id}'),
                    borderRadius: BorderRadius.circular(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (course.thumbnailUrl != null)
                          ClipRRect(
                            borderRadius: const BorderRadius.vertical(
                              top: Radius.circular(12),
                            ),
                            child: Image.network(
                              course.thumbnailUrl!,
                              height: 160,
                              width: double.infinity,
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => Container(
                                height: 160,
                                color: Colors.grey[200],
                                child: const Icon(Icons.image),
                              ),
                            ),
                          ),
                        Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                course.title,
                                style: Theme.of(context)
                                    .textTheme
                                    .titleMedium
                                    ?.copyWith(
                                      fontWeight: FontWeight.bold,
                                    ),
                              ),
                              if (course.shortDesc != null) ...[
                                const SizedBox(height: 4),
                                Text(
                                  course.shortDesc!,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    color: Colors.grey[600],
                                    fontSize: 13,
                                  ),
                                ),
                              ],
                              const SizedBox(height: 8),
                              Row(
                                children: [
                                  Builder(
                                    builder: (context) {
                                      final isCourseFree = course.isFree || (course.price ?? 0) == 0;
                                      return Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 8,
                                          vertical: 4,
                                        ),
                                        decoration: BoxDecoration(
                                          color: isCourseFree
                                              ? Colors.green[50]
                                              : Colors.blue[50],
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                        child: Text(
                                          isCourseFree
                                              ? 'Free'
                                              : '${course.currency} ${course.price?.toStringAsFixed(2) ?? '0.00'}',
                                          style: TextStyle(
                                            fontSize: 12,
                                            fontWeight: FontWeight.bold,
                                            color: isCourseFree
                                                ? Colors.green[800]
                                                : Colors.blue[800],
                                          ),
                                        ),
                                      );
                                    },
                                  ),
                                  if (course.level != null) ...[
                                    const SizedBox(width: 8),
                                    Text(
                                      course.level!,
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: Colors.grey[600],
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
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
