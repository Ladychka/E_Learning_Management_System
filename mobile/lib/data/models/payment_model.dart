import 'package:flutter/material.dart';
import 'package:equatable/equatable.dart';

class Payment extends Equatable {
  final String id;
  final String userId;
  final String? courseId;
  final String? subscriptionId;
  final String gateway; // KHQR, ABA_PAYWAY, BAKONG
  final double amount;
  final String currency;
  final String status; // PENDING, SUCCESS, FAILED, REFUNDED
  final String? description;
  final DateTime createdAt;
  final DateTime? paidAt;
  final String? invoiceUrl;

  const Payment({
    required this.id,
    required this.userId,
    this.courseId,
    this.subscriptionId,
    required this.gateway,
    required this.amount,
    required this.currency,
    required this.status,
    this.description,
    required this.createdAt,
    this.paidAt,
    this.invoiceUrl,
  });

  factory Payment.fromJson(Map<String, dynamic> json) {
    return Payment(
      id: json['id'] as String? ?? '',
      userId: json['userId'] as String? ?? '',
      courseId: json['courseId'] as String?,
      subscriptionId: json['subscriptionId'] as String?,
      gateway: json['gateway'] as String? ?? 'UNKNOWN',
      amount: num.tryParse(json['amount'].toString())?.toDouble() ?? 0.0,
      currency: json['currency'] as String? ?? 'USD',
      status: json['status'] as String? ?? 'PENDING',
      description: json['description'] as String?,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
      paidAt: json['paidAt'] != null
          ? DateTime.tryParse(json['paidAt'].toString())
          : null,
      invoiceUrl: json['invoiceUrl'] as String?,
    );
  }

  bool get isSuccess => status == 'SUCCESS';
  bool get isPending => status == 'PENDING';
  bool get isFailed => status == 'FAILED';
  bool get isRefunded => status == 'REFUNDED';

  String get displayAmount => '$currency ${amount.toStringAsFixed(2)}';

  Color get statusColor {
    switch (status) {
      case 'SUCCESS':
        return Colors.green;
      case 'PENDING':
        return Colors.orange;
      case 'FAILED':
        return Colors.red;
      case 'REFUNDED':
        return Colors.blue;
      default:
        return Colors.grey;
    }
  }

  @override
  List<Object?> get props => [id, userId, amount, status, gateway];
}
