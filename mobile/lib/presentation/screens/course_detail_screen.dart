import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../data/models/course_model.dart';
import '../../data/models/enrollment_model.dart';
import '../../data/services/api_service.dart';
import '../blocs/assignment/assignment_cubit.dart';
import '../blocs/course/course_cubit.dart';
import '../blocs/enrollment/enrollment_cubit.dart';

class CourseDetailScreen extends StatefulWidget {
  final String courseId;
  const CourseDetailScreen({super.key, required this.courseId});

  @override
  State<CourseDetailScreen> createState() => _CourseDetailScreenState();
}

class _CourseDetailScreenState extends State<CourseDetailScreen>
    with SingleTickerProviderStateMixin {
  bool _enrolling = false;
  Course? _course;
  Enrollment? _myEnrollment;
  late TabController _tabController;
  final ApiService _api = ApiService();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    context.read<CourseCubit>().fetchModules(widget.courseId);
    _fetchCourseDetail();
    _checkEnrollment();
    context.read<AssignmentCubit>().fetchAssignments(courseId: widget.courseId);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _fetchCourseDetail() async {
    try {
      final res = await _api.get('/courses/${widget.courseId}');
      final course = Course.fromJson(res.data['data'] as Map<String, dynamic>);
      if (mounted) setState(() => _course = course);
    } catch (_) {
      // ignore — fallback to no metadata
    }
  }

  Future<void> _checkEnrollment() async {
    try {
      final res = await _api.get('/enrollments/my-enrollments');
      final list = (res.data['data'] as List<dynamic>)
          .map((e) => Enrollment.fromJson(e as Map<String, dynamic>))
          .toList();
      final enrolled = list.firstWhere(
        (e) => e.courseId == widget.courseId && e.isActive,
        orElse: () => list.firstWhere(
          (e) => e.courseId == widget.courseId,
          orElse: () => Enrollment(
            id: '',
            userId: '',
            courseId: '',
            status: 'UNKNOWN',
            enrolledAt: DateTime.now(),
          ),
        ),
      );
      if (enrolled.courseId == widget.courseId && mounted) {
        setState(() => _myEnrollment = enrolled);
      }
    } catch (_) {
      // ignore
    }
  }

  Future<void> _enrollOrCheckout() async {
    final course = _course;
    if (course == null) return;

    final isFree = course.isFree || (course.price ?? 0) == 0;
    if (isFree) {
      await _enrollFree();
    } else {
      if (mounted) {
        context.push('/checkout/${widget.courseId}', extra: {
          'amount': course.price ?? 0,
          'currency': course.currency,
          'title': course.title,
        });
      }
    }
  }

  Future<void> _enrollFree() async {
    setState(() => _enrolling = true);
    try {
      await _api.post('/enrollments/enroll', data: {
        'courseId': widget.courseId,
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Enrolled successfully')),
        );
        context.read<EnrollmentCubit>().fetchMyEnrollments();
        await _checkEnrollment();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString())),
        );
      }
    } finally {
      if (mounted) setState(() => _enrolling = false);
    }
  }

  bool get _isEnrolled =>
      _myEnrollment != null && (_myEnrollment!.isActive || _myEnrollment!.isCompleted);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_course?.title ?? 'Course Detail'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Curriculum'),
            Tab(text: 'Assignments'),
          ],
        ),
      ),
      body: BlocBuilder<CourseCubit, CourseState>(
        builder: (context, state) {
          if (state is CourseLoading) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state is ModulesLoaded) {
            final modules = state.modules;
            return TabBarView(
              controller: _tabController,
              children: [
                _buildCurriculumTab(context, modules),
                _buildAssignmentsTab(context),
              ],
            );
          }
          if (state is CourseError) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(state.message),
                  const SizedBox(height: 8),
                  ElevatedButton(
                    onPressed: () => context
                        .read<CourseCubit>()
                        .fetchModules(widget.courseId),
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          }
          return const SizedBox.shrink();
        },
      ),
      bottomNavigationBar: _buildBottomBar(context),
    );
  }

  Widget _buildCurriculumTab(
    BuildContext context,
    List<dynamic> modules,
  ) {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: modules.length + 1,
      itemBuilder: (_, index) {
        if (index == 0) {
          return _buildCourseHeader(context);
        }
        final module = modules[index - 1];
        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: ExpansionTile(
            title: Text(
              module.title,
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            subtitle: module.description != null
                ? Text(
                    module.description!,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  )
                : null,
            children: module.lessons.map<Widget>((lesson) {
              return ListTile(
                dense: true,
                leading: Icon(_iconForType(lesson.contentType)),
                title: Text(lesson.title),
                trailing: lesson.isPreview
                    ? Chip(
                        label: const Text('Free'),
                        backgroundColor: Colors.green[50],
                        labelStyle: TextStyle(color: Colors.green[800]),
                      )
                    : _isEnrolled
                        ? const Icon(Icons.play_circle_outline, size: 18, color: Color(0xFF2563EB))
                        : const Icon(Icons.lock_outline, size: 16),
                onTap: () {
                  if (lesson.isPreview || _isEnrolled) {
                    context.go('/lessons/${lesson.id}');
                  } else {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text(
                            'Enroll in this course to access all lessons'),
                      ),
                    );
                  }
                },
              );
            }).toList(),
          ),
        );
      },
    );
  }

  Widget _buildCourseHeader(BuildContext context) {
    final course = _course;
    if (course == null) return const SizedBox.shrink();
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (course.thumbnailUrl != null)
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
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
            const SizedBox(height: 12),
            Text(
              course.title,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            if (course.description != null) ...[
              const SizedBox(height: 8),
              Text(
                course.description!,
                style: TextStyle(color: Colors.grey[700]),
              ),
            ],
            const SizedBox(height: 12),
            Row(
              children: [
                Chip(
                  label: Text(course.isFree ? 'Free' : '${course.currency} ${course.price?.toStringAsFixed(2) ?? '0'}'),
                  backgroundColor: course.isFree ? Colors.green[50] : Colors.blue[50],
                  labelStyle: TextStyle(
                    color: course.isFree ? Colors.green[800] : Colors.blue[800],
                    fontWeight: FontWeight.bold,
                  ),
                ),
                if (course.level != null) ...[
                  const SizedBox(width: 8),
                  Text(course.level!, style: TextStyle(color: Colors.grey[600])),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAssignmentsTab(BuildContext context) {
    return BlocBuilder<AssignmentCubit, AssignmentState>(
      builder: (context, state) {
        if (state is AssignmentLoading) {
          return const Center(child: CircularProgressIndicator());
        }
        if (state is AssignmentError) {
          return Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(state.message),
                const SizedBox(height: 8),
                ElevatedButton(
                  onPressed: () => context
                      .read<AssignmentCubit>()
                      .fetchAssignments(courseId: widget.courseId),
                  child: const Text('Retry'),
                ),
              ],
            ),
          );
        }
        if (state is AssignmentsLoaded) {
          final assignments = state.assignments;
          if (assignments.isEmpty) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.assignment_outlined, size: 64, color: Colors.grey[400]),
                  const SizedBox(height: 16),
                  Text(
                    'No assignments for this course',
                    style: TextStyle(color: Colors.grey[600]),
                  ),
                ],
              ),
            );
          }
          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: assignments.length,
            itemBuilder: (_, index) {
              final a = assignments[index];
              final isOverdue = a.dueDate != null && DateTime.now().isAfter(a.dueDate!);
              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                child: ListTile(
                  leading: Icon(
                    Icons.assignment,
                    color: isOverdue ? Colors.red : const Color(0xFF2563EB),
                  ),
                  title: Text(a.title),
                  subtitle: a.dueDate != null
                      ? Text(
                          'Due: ${a.dueDate.toString().substring(0, 10)}',
                          style: TextStyle(
                            color: isOverdue ? Colors.red : Colors.grey[600],
                          ),
                        )
                      : null,
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => context.push('/assignments/${a.id}'),
                ),
              );
            },
          );
        }
        return const SizedBox.shrink();
      },
    );
  }

  Widget? _buildBottomBar(BuildContext context) {
    if (_isEnrolled) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withAlpha(10),
              blurRadius: 4,
              offset: const Offset(0, -2),
            ),
          ],
        ),
        child: SafeArea(
          child: FilledButton.icon(
            onPressed: () => context.go('/enrollments'),
            icon: const Icon(Icons.school),
            label: const Text('Go to My Enrollments'),
          ),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(10),
            blurRadius: 4,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: SafeArea(
        child: FilledButton.icon(
          onPressed: _enrolling ? null : _enrollOrCheckout,
          icon: _enrolling
              ? const SizedBox(
                  height: 18,
                  width: 18,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                )
              : const Icon(Icons.person_add),
          label: Text(_enrolling ? 'Enrolling...' : 'Enroll Now'),
        ),
      ),
    );
  }

  IconData _iconForType(String type) {
    switch (type) {
      case 'video':
        return Icons.play_circle_outline;
      case 'pdf':
        return Icons.picture_as_pdf;
      case 'quiz':
        return Icons.quiz;
      default:
        return Icons.article;
    }
  }
}
