import 'package:equatable/equatable.dart';

class CheckoutResult extends Equatable {
  final String paymentId;
  final double amount;
  final String currency;
  final String status;
  final String gateway;
  final String? qrData;
  final String? qrImage;
  final String? paymentUrl;
  final String? deeplink;

  const CheckoutResult({
    required this.paymentId,
    required this.amount,
    required this.currency,
    required this.status,
    required this.gateway,
    this.qrData,
    this.qrImage,
    this.paymentUrl,
    this.deeplink,
  });

  factory CheckoutResult.fromJson(Map<String, dynamic> json) {
    return CheckoutResult(
      paymentId: json['paymentId'] as String? ?? '',
      amount: num.tryParse(json['amount'].toString())?.toDouble() ?? 0.0,
      currency: json['currency'] as String? ?? 'USD',
      status: json['status'] as String? ?? 'pending',
      gateway: json['gateway'] as String? ?? 'UNKNOWN',
      qrData: json['qrData'] as String?,
      qrImage: json['qrImage'] as String?,
      paymentUrl: json['paymentUrl'] as String?,
      deeplink: json['deeplink'] as String?,
    );
  }

  bool get isPending => status.toLowerCase() == 'pending';
  bool get isCompleted =>
      status.toLowerCase() == 'completed' ||
      status.toLowerCase() == 'success' ||
      status.toLowerCase() == 'paid';
  bool get isKHQR => gateway.toLowerCase() == 'khqr';
  bool get isABAPayWay => gateway.toLowerCase() == 'aba_payway';
  bool get isBakong => gateway.toLowerCase() == 'bakong';

  @override
  List<Object?> get props => [paymentId, amount, status, gateway];
}
