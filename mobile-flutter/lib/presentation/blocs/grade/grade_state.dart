part of 'grade_cubit.dart';

abstract class GradeState extends Equatable {
  const GradeState();

  @override
  List<Object?> get props => [];
}

class GradeInitial extends GradeState {
  const GradeInitial();
}

class GradeLoading extends GradeState {
  const GradeLoading();
}

class GradesLoaded extends GradeState {
  final List<Grade> grades;
  const GradesLoaded(this.grades);

  @override
  List<Object?> get props => [grades];
}

class GPALoaded extends GradeState {
  final double? gpa;
  const GPALoaded(this.gpa);

  @override
  List<Object?> get props => [gpa];
}

class GradeError extends GradeState {
  final String message;
  const GradeError(this.message);

  @override
  List<Object?> get props => [message];
}
