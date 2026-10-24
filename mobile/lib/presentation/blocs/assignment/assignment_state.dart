part of 'assignment_cubit.dart';

abstract class AssignmentState extends Equatable {
  const AssignmentState();

  @override
  List<Object?> get props => [];
}

class AssignmentInitial extends AssignmentState {
  const AssignmentInitial();
}

class AssignmentLoading extends AssignmentState {
  const AssignmentLoading();
}

class AssignmentsLoaded extends AssignmentState {
  final List<Assignment> assignments;
  const AssignmentsLoaded(this.assignments);

  @override
  List<Object?> get props => [assignments];
}

class AssignmentDetailLoaded extends AssignmentState {
  final Assignment assignment;
  const AssignmentDetailLoaded(this.assignment);

  @override
  List<Object?> get props => [assignment];
}

class AssignmentError extends AssignmentState {
  final String message;
  const AssignmentError(this.message);

  @override
  List<Object?> get props => [message];
}
