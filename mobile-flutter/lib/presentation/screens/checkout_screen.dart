import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../../core/constants.dart';
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

  Timer? _pollTimer;
  Timer? _countdownTimer;
  int _secondsRemaining = 300;
  bool _simulating = false;

  @override
  void dispose() {
    _pollTimer?.cancel();
    _countdownTimer?.cancel();
    _couponCtrl.dispose();
    super.dispose();
  }

  void _startPolling(String paymentId) {
    _pollTimer?.cancel();
    _countdownTimer?.cancel();
    _secondsRemaining = 300;

    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted ||
          _checkoutResult == null ||
          _checkoutResult!.isCompleted) {
        timer.cancel();
        return;
      }
      if (_secondsRemaining <= 1) {
        timer.cancel();
        _pollTimer?.cancel();
        setState(() {
          _secondsRemaining = 0;
          _checkoutResult = null;
          _error = 'QR payment session expired. Please try again.';
        });
      } else {
        setState(() => _secondsRemaining--);
      }
    });

    _pollTimer = Timer.periodic(const Duration(seconds: 3), (timer) async {
      if (!mounted) {
        timer.cancel();
        return;
      }
      try {
        final res = await _api.get('/payments/$paymentId');
        if (!mounted) return;
        final data = res.data['data'] as Map<String, dynamic>;
        final status = (data['status'] as String? ?? '').toLowerCase();

        if (status == 'completed' || status == 'paid' || status == 'success') {
          final amount =
              num.tryParse(data['amount']?.toString() ?? '')?.toDouble() ??
                  widget.amount;
          timer.cancel();
          _countdownTimer?.cancel();
          if (!mounted) return;
          setState(() {
            _checkoutResult = CheckoutResult(
              paymentId: paymentId,
              amount: amount,
              currency: data['currency'] as String? ?? widget.currency,
              status: 'completed',
              gateway: data['gateway'] as String? ?? 'khqr',
            );
          });
        } else if (status == 'failed' || status == 'refunded') {
          timer.cancel();
          _countdownTimer?.cancel();
          if (!mounted) return;
          setState(() {
            _checkoutResult = null;
            _error = 'Payment $status. Please try again.';
          });
        }
      } catch (_) {}
    });
  }

  Future<void> _simulateConfirm(String paymentId) async {
    if (!mounted) return;
    setState(() => _simulating = true);
    try {
      await _api.post('/payments/$paymentId/confirm', data: {
        'gatewayRef': 'SANDBOX-APP-${DateTime.now().millisecondsSinceEpoch}',
        'status': 'completed',
      });
      // The polling loop or next tick will pick up completion, or set directly
      _pollTimer?.cancel();
      _countdownTimer?.cancel();
      if (!mounted) return;
      setState(() {
        _simulating = false;
        _checkoutResult = CheckoutResult(
          paymentId: paymentId,
          amount: widget.amount,
          currency: widget.currency,
          status: 'completed',
          gateway: 'khqr',
        );
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _simulating = false;
        _error = 'Simulation failed: $e';
      });
    }
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

      final discount = num.tryParse(
            payment['discountAmount']?.toString() ?? '',
          )?.toDouble() ??
          0;
      final result = CheckoutResult.fromJson(checkoutData);

      if (!mounted) return;
      setState(() {
        _discountAmount = discount;
        _checkoutResult = result;
        _loading = false;
      });

      if (!result.isCompleted &&
          (result.qrImage != null ||
              result.isKHQR ||
              result.isBakong ||
              result.paymentUrl != null)) {
        _startPolling(result.paymentId);
      }
    } catch (e) {
      if (!mounted) return;
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
                onPressed: _loading ? null : () => _checkout('khqr'),
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

    if (result.payway != null) {
      final supportsNativeWebView =
          !kIsWeb &&
          (defaultTargetPlatform == TargetPlatform.android ||
              defaultTargetPlatform == TargetPlatform.iOS);
      if (!supportsNativeWebView) {
        return _buildPaywayWebFallback(context, result.payway!);
      }
      return _PaywayWebView(payway: result.payway!);
    }

    if (result.qrImage != null) {
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

  Widget _buildPaywayWebFallback(BuildContext context, PaywayCheckout payway) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.lock_outline, size: 64, color: Color(0xFF0066B3)),
            const SizedBox(height: 16),
            const Text(
              'Secure ABA PayWay Checkout',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            const Text(
              'Open the payment gateway in your browser to complete this payment.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey),
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: () async {
                final uri = Uri.parse(payway.action);
                if (await canLaunchUrl(uri)) {
                  await launchUrl(uri, mode: LaunchMode.externalApplication);
                }
              },
              icon: const Icon(Icons.open_in_browser),
              label: const Text('Open Payment Page'),
            ),
          ],
        ),
      ),
    );
  }

  String _resolveMediaUrl(String url) {
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    final apiRoot = ApiConstants.baseUrl.replaceAll('/api/v1', '');
    return url.startsWith('/') ? '$apiRoot$url' : '$apiRoot/$url';
  }

  Widget _buildQRCodeView(BuildContext context, CheckoutResult result) {
    final mins = _secondsRemaining ~/ 60;
    final secs = _secondsRemaining % 60;
    final timeStr = '${mins.toString().padLeft(2, '0')}:${secs.toString().padLeft(2, '0')}';

    final amountKhr = result.currency.toUpperCase() == 'KHR'
        ? result.amount.round()
        : (result.amount * 4100).round();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981).withAlpha(25),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.timer_outlined, size: 16, color: Color(0xFF10B981)),
                    const SizedBox(width: 6),
                    Text(
                      'Expires in $timeStr',
                      style: const TextStyle(
                        color: Color(0xFF10B981),
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            'Scan with ACLEDA, Bakong or Any Banking App',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 6),
          Text(
            '${result.currency} ${result.amount.toStringAsFixed(2)}  (≈ ${amountKhr.toString()} ៛)',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  color: const Color(0xFF10B981),
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 20),
          Card(
            elevation: 4,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Image.network(
                    _resolveMediaUrl(result.qrImage!),
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
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const SizedBox(
                        height: 14,
                        width: 14,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Checking for transaction...',
                        style: TextStyle(color: Colors.grey[600], fontSize: 12),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              TextButton.icon(
                onPressed: () {
                  Clipboard.setData(ClipboardData(text: result.qrData ?? ''));
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Payment data copied to clipboard')),
                  );
                },
                icon: const Icon(Icons.copy, size: 18),
                label: const Text('Copy KHQR Payload'),
              ),
            ],
          ),
          const SizedBox(height: 16),
          // Sandbox quick-simulate button for testing / evaluation
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFF10B981),
                side: const BorderSide(color: Color(0xFF10B981)),
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
              onPressed: _simulating
                  ? null
                  : () => _simulateConfirm(result.paymentId),
              icon: _simulating
                  ? const SizedBox(
                      height: 16,
                      width: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.bolt, size: 18),
              label: Text(_simulating
                  ? 'Confirming with NBC Sandbox...'
                  : '⚡ Simulate Success (Sandbox Demo)'),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Official National Bank of Cambodia KHQR test rail',
            style: TextStyle(color: Colors.grey[500], fontSize: 11),
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

class _PaywayWebView extends StatefulWidget {
  final PaywayCheckout payway;

  const _PaywayWebView({required this.payway});

  @override
  State<_PaywayWebView> createState() => _PaywayWebViewState();
}

class _PaywayWebViewState extends State<_PaywayWebView> {
  late final WebViewController _controller;

  String _escape(String value) => value
      .replaceAll('&', '&amp;')
      .replaceAll('"', '&quot;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');

  String _buildAutoSubmitHtml() {
    final fields = widget.payway.fields.entries
        .map(
          (entry) =>
              '<input type="hidden" name="${_escape(entry.key)}" value="${_escape(entry.value)}" />',
        )
        .join();
    return '''
<!DOCTYPE html>
<html>
  <body onload="document.forms[0].submit()">
    <p>Redirecting to ABA PayWay...</p>
    <form method="POST" action="${_escape(widget.payway.action)}">
      $fields
    </form>
  </body>
</html>
''';
  }

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..loadHtmlString(_buildAutoSubmitHtml());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('ABA PayWay'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => context.pop(),
        ),
      ),
      body: WebViewWidget(controller: _controller),
    );
  }
}
