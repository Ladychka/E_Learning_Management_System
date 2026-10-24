part of 'enrollment_cubit.dart';

abstract class EnrollmentState extends Equatable {
  const EnrollmentState();

  @override
  List<Object?> get props => [];
}

class EnrollmentInitial extends EnrollmentState {
  const EnrollmentInitial();
}

class EnrollmentLoading extends EnrollmentState {
  const EnrollmentLoading();
}

class EnrollmentsLoaded extends EnrollmentState {
  final List<Enrollment> enrollments;
  const EnrollmentsLoaded(this.enrollments);

  @override
  List<Object?> get props => [enrollments];
}

class EnrollmentError extends EnrollmentState {
  final String message;
  const EnrollmentError(this.message);

  @override
  List<Object?> get props => [message];
}
