import 'package:equatable/equatable.dart';

class User extends Equatable {
  final String id;
  final String email;
  final String firstName;
  final String lastName;
  final String? avatarUrl;
  final String role;
  final String status;
  final bool isEmailVerified;

  const User({
    required this.id,
    required this.email,
    required this.firstName,
    required this.lastName,
    this.avatarUrl,
    required this.role,
    required this.status,
    required this.isEmailVerified,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as String? ?? '',
      email: json['email'] as String? ?? '',
      firstName: json['firstName'] as String? ?? '',
      lastName: json['lastName'] as String? ?? '',
      avatarUrl: json['avatarUrl'] as String?,
      role: json['role'] as String? ?? 'STUDENT',
      status: json['status'] as String? ?? 'ACTIVE',
      isEmailVerified: json['isEmailVerified'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'email': email,
    'firstName': firstName,
    'lastName': lastName,
    'avatarUrl': avatarUrl,
    'role': role,
    'status': status,
    'isEmailVerified': isEmailVerified,
  };

  String get displayName => '$firstName $lastName';

  bool get isAdmin => role == 'ADMIN';
  bool get isInstructor => role == 'INSTRUCTOR';
  bool get isStudent => role == 'STUDENT';

  @override
  List<Object?> get props => [id, email, firstName, lastName, role, status];
}
