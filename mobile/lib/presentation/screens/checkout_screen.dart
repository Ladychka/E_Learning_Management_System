import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../data/models/checkout_model.dart';
import '../../data/services/api_service.dart';

class CheckoutScreen extends StatefulWidget {
  final String courseId;
  final double amount;
  final String currency;
  final String courseTitle;
  const CheckoutScreen({
    super.key,
    required this.courseId,
    required this.amount,
    required this.currency,
    required this.courseTitle,
  });

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final ApiService _api = ApiService();
  bool _loading = false;
  String? _error;
  CheckoutResult? _checkoutResult;
  final _couponCtrl = TextEditingController();
  double _discountAmount = 0;
  double get _finalAmount => widget.amount - _discountAmount;

  @override
  void dispose() {
    _couponCtrl.dispose();
    super.dispose();
  }

  Future<void> _checkout(String gateway) async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await _api.post('/payments/checkout', data: {
        'courseId': widget.courseId,
        'gateway': gateway,
        if (_couponCtrl.text.isNotEmpty) 'couponCode': _couponCtrl.text,
      });

      final checkoutData = res.data['data']['checkout'] as Map<String, dynamic>;
      final payment = res.data['data']['payment'] as Map<String, dynamic>;

      final discount = (payment['discountAmount'] as num?)?.toDouble() ?? 0;
      setState(() {
        _discountAmount = discount;
        _checkoutResult = CheckoutResult.fromJson(checkoutData);
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _checkoutResult = null;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Checkout'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => context.pop(),
        ),
      ),
      body: _checkoutResult != null
          ? _buildPaymentResult(context)
          : _buildCheckoutForm(context),
    );
  }

  Widget _buildCheckoutForm(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.courseTitle,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Price'),
                      Text(
                        '${widget.currency} ${_finalAmount.toStringAsFixed(2)}',
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  if (_discountAmount > 0) ...[
                    const SizedBox(height: 4),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Discount',
                          style: TextStyle(color: Colors.green),
                        ),
                        Text(
                          '-${widget.currency} ${_discountAmount.toStringAsFixed(2)}',
                          style: const TextStyle(
                            color: Colors.green,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),
          TextField(
            controller: _couponCtrl,
            decoration: InputDecoration(
              labelText: 'Coupon Code (optional)',
              suffixIcon: IconButton(
                icon: const Icon(Icons.check),
                onPressed: () {
                  // Validate coupon visually handled by backend on checkout
                },
              ),
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 16),
            Text(
              _error!,
              style: const TextStyle(color: Colors.red),
            ),
          ],
          const SizedBox(height: 24),
          Text(
            'Select Payment Method',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 12),
          if (widget.amount == 0)
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: _loading ? null : () => _checkout('free'),
                child: _loading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Text('Enroll for Free'),
              ),
            )
          else ...[
            _buildPaymentButton(
              context,
              label: 'KHQR',
              icon: Icons.qr_code,
              color: const Color(0xFF004D99),
              onTap: () => _checkout('khqr'),
            ),
            const SizedBox(height: 8),
            _buildPaymentButton(
              context,
              label: 'ABA PayWay',
              icon: Icons.credit_card,
              color: const Color(0xFF0066B3),
              onTap: () => _checkout('aba_payway'),
            ),
            const SizedBox(height: 8),
            _buildPaymentButton(
              context,
              label: 'Bakong',
              icon: Icons.account_balance,
              color: const Color(0xFFE31837),
              onTap: () => _checkout('bakong'),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildPaymentButton(
    BuildContext context, {
    required String label,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Card(
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: color.withAlpha(26),
          child: Icon(icon, color: color),
        ),
        title: Text(label),
        trailing: _loading
            ? const SizedBox(
                height: 20,
                width: 20,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            : const Icon(Icons.chevron_right),
        onTap: _loading ? null : onTap,
      ),
    );
  }

  Widget _buildPaymentResult(BuildContext context) {
    final result = _checkoutResult!;

    if (result.isCompleted) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.check_circle, size: 80, color: Colors.green),
            const SizedBox(height: 16),
            const Text(
              'Enrollment Successful!',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              'You are now enrolled in ${widget.courseTitle}',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey[600]),
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: () {
                context.pop();
                context.go('/enrollments');
              },
              child: const Text('Go to My Enrollments'),
            ),
          ],
        ),
      );
    }

    if (result.isKHQR && result.qrImage != null) {
      return _buildQRCodeView(context, result);
    }

    if (result.isABAPayWay && result.paymentUrl != null) {
      return _buildWebViewPayment(context, result.paymentUrl!);
    }

    if (result.isBakong && result.deeplink != null) {
      return _buildDeeplinkView(context, result);
    }

    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.info_outline, size: 48, color: Colors.grey),
          const SizedBox(height: 16),
          const Text('Payment initiated'),
          TextButton(
            onPressed: () => context.pop(),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  Widget _buildQRCodeView(BuildContext context, CheckoutResult result) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Text(
            'Scan to Pay',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            '${result.currency} ${result.amount.toStringAsFixed(2)}',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  color: const Color(0xFF2563EB),
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 24),
          Card(
            elevation: 4,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Image.network(
                result.qrImage!,
                height: 240,
                width: 240,
                fit: BoxFit.contain,
                errorBuilder: (_, __, ___) => Container(
                  height: 240,
                  width: 240,
                  color: Colors.grey[200],
                  child: const Icon(Icons.qr_code, size: 80),
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),
          TextButton.icon(
            onPressed: () {
              Clipboard.setData(ClipboardData(text: result.qrData ?? ''));
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Copied to clipboard')),
              );
            },
            icon: const Icon(Icons.copy, size: 18),
            label: const Text('Copy Payment Data'),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: () => context.pop(),
              child: const Text('I\'ve Completed Payment'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDeeplinkView(BuildContext context, CheckoutResult result) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Text(
            'Open Bakong App',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            '${result.currency} ${result.amount.toStringAsFixed(2)}',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  color: const Color(0xFF2563EB),
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: () async {
                final url = result.deeplink;
                if (url != null && await canLaunchUrl(Uri.parse(url))) {
                  await launchUrl(
                    Uri.parse(url),
                    mode: LaunchMode.externalApplication,
                  );
                }
              },
              icon: const Icon(Icons.open_in_new),
              label: const Text('Open Bakong App'),
            ),
          ),
          const SizedBox(height: 24),
          if (result.qrData != null) ...[
            Card(
              elevation: 4,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Image.network(
                  'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${Uri.encodeComponent(result.qrData!)}',
                  height: 240,
                  width: 240,
                  fit: BoxFit.contain,
                  errorBuilder: (_, __, ___) => Container(
                    height: 240,
                    width: 240,
                    color: Colors.grey[200],
                    child: const Icon(Icons.qr_code, size: 80),
                  ),
                ),
              ),
            ),
          ],
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: () => context.pop(),
              child: const Text('I\'ve Completed Payment'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWebViewPayment(BuildContext context, String url) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.open_in_browser, size: 64, color: Color(0xFF2563EB)),
          const SizedBox(height: 16),
          const Text(
            'Complete Payment',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Text(
            'You will be redirected to the payment gateway',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.grey[600]),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: FilledButton.icon(
                onPressed: () async {
                  final uri = Uri.parse(url);
                  if (await canLaunchUrl(uri)) {
                    await launchUrl(uri, mode: LaunchMode.externalApplication);
                  }
                },
                icon: const Icon(Icons.launch),
                label: const Text('Open Payment Page'),
              ),
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: OutlinedButton(
                onPressed: () => context.pop(),
                child: const Text('Cancel'),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
