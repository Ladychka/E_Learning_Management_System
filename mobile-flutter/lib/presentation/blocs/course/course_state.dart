part of 'course_cubit.dart';

abstract class CourseState extends Equatable {
  const CourseState();

  @override
  List<Object?> get props => [];
}

class CourseInitial extends CourseState {
  const CourseInitial();
}

class CourseLoading extends CourseState {
  const CourseLoading();
}

class CoursesLoaded extends CourseState {
  final List<Course> courses;
  const CoursesLoaded(this.courses);

  @override
  List<Object?> get props => [courses];
}

class CourseDetailLoaded extends CourseState {
  final Course course;
  const CourseDetailLoaded(this.course);

  @override
  List<Object?> get props => [course];
}

class ModulesLoaded extends CourseState {
  final List<CourseModule> modules;
  const ModulesLoaded(this.modules);

  @override
  List<Object?> get props => [modules];
}

class CourseError extends CourseState {
  final String message;
  const CourseError(this.message);

  @override
  List<Object?> get props => [message];
}
