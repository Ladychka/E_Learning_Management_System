import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../blocs/locale/locale_cubit.dart';
import '../../core/localization.dart';

class FinanceHubScreen extends StatefulWidget {
  const FinanceHubScreen({super.key});

  @override
  State<FinanceHubScreen> createState() => _FinanceHubScreenState();
}

class _FinanceHubScreenState extends State<FinanceHubScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 5, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final langCode = context.watch<LocaleCubit>().state.locale.languageCode;

    return Scaffold(
      appBar: AppBar(
        title: Text(AppStrings.get('nav_finance_hub', langCode)),
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          indicatorColor: const Color(0xFF10B981),
          labelColor: const Color(0xFF10B981),
          tabs: const [
            Tab(icon: Icon(Icons.calculate_outlined), text: 'Loan / EMI'),
            Tab(icon: Icon(Icons.trending_up), text: 'Compound'),
            Tab(icon: Icon(Icons.pie_chart_outline), text: '50/30/20 Budget'),
            Tab(icon: Icon(Icons.currency_exchange), text: 'USD ↔ KHR'),
            Tab(icon: Icon(Icons.menu_book_outlined), text: 'Glossary'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _LoanCalculatorTab(langCode: langCode),
          _CompoundGrowthTab(langCode: langCode),
          _BudgetingTab(langCode: langCode),
          _CurrencyConverterTab(langCode: langCode),
          _FintechGlossaryTab(langCode: langCode),
        ],
      ),
    );
  }
}

// -------------------------------------------------------------
// TAB 1: LOAN / EMI CALCULATOR
// -------------------------------------------------------------
class _LoanCalculatorTab extends StatefulWidget {
  final String langCode;
  const _LoanCalculatorTab({required this.langCode});

  @override
  State<_LoanCalculatorTab> createState() => _LoanCalculatorTabState();
}

class _LoanCalculatorTabState extends State<_LoanCalculatorTab> {
  final _amountCtrl = TextEditingController(text: '10000');
  final _rateCtrl = TextEditingController(text: '12');
  final _monthsCtrl = TextEditingController(text: '24');
  String _currency = 'USD';

  double _monthlyPayment = 0;
  double _totalInterest = 0;
  double _totalPayment = 0;

  @override
  void initState() {
    super.initState();
    _calculate();
  }

  void _calculate() {
    final principal = double.tryParse(_amountCtrl.text) ?? 0;
    final annualRate = double.tryParse(_rateCtrl.text) ?? 0;
    final months = int.tryParse(_monthsCtrl.text) ?? 1;

    if (principal <= 0 || annualRate <= 0 || months <= 0) {
      setState(() {
        _monthlyPayment = 0;
        _totalInterest = 0;
        _totalPayment = 0;
      });
      return;
    }

    final monthlyRate = (annualRate / 100) / 12;
    final emi = (principal * monthlyRate * pow(1 + monthlyRate, months)) /
        (pow(1 + monthlyRate, months) - 1);
    final total = emi * months;
    final interest = total - principal;

    setState(() {
      _monthlyPayment = emi;
      _totalInterest = interest;
      _totalPayment = total;
    });
  }

  @override
  Widget build(BuildContext context) {
    final isKhmer = widget.langCode == 'km';

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Card(
            color: const Color(0xFF0F172A),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Text(
                    isKhmer ? 'ការបង់ប្រាក់ប្រចាំខែប៉ាន់ស្មាន' : 'Estimated Monthly Payment',
                    style: const TextStyle(color: Colors.white70, fontSize: 13),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '$_currency ${_monthlyPayment.toStringAsFixed(2)}',
                    style: const TextStyle(
                      color: Color(0xFF10B981),
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const Divider(color: Colors.white24, height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      Column(
                        children: [
                          Text(
                            isKhmer ? 'ការប្រាក់សរុប' : 'Total Interest',
                            style: const TextStyle(color: Colors.white60, fontSize: 12),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '$_currency ${_totalInterest.toStringAsFixed(2)}',
                            style: const TextStyle(
                              color: Colors.amberAccent,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                      Column(
                        children: [
                          Text(
                            isKhmer ? 'ការទូទាត់សរុប' : 'Total Payment',
                            style: const TextStyle(color: Colors.white60, fontSize: 12),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '$_currency ${_totalPayment.toStringAsFixed(2)}',
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _amountCtrl,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(
                    labelText: isKhmer ? 'ចំនួនទឹកប្រាក់កម្ចី' : 'Loan Amount',
                    prefixIcon: const Icon(Icons.attach_money),
                  ),
                  onChanged: (_) => _calculate(),
                ),
              ),
              const SizedBox(width: 8),
              SegmentedButton<String>(
                segments: const [
                  ButtonSegment(value: 'USD', label: Text('USD')),
                  ButtonSegment(value: 'KHR', label: Text('KHR')),
                ],
                selected: {_currency},
                onSelectionChanged: (set) {
                  setState(() => _currency = set.first);
                },
              ),
            ],
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _rateCtrl,
            keyboardType: TextInputType.number,
            decoration: InputDecoration(
              labelText: isKhmer ? 'អត្រាការប្រាក់ប្រចាំឆ្នាំ (%)' : 'Annual Interest Rate (%)',
              prefixIcon: const Icon(Icons.percent),
            ),
            onChanged: (_) => _calculate(),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _monthsCtrl,
            keyboardType: TextInputType.number,
            decoration: InputDecoration(
              labelText: isKhmer ? 'រយៈពេលកម្ចី (ខែ)' : 'Loan Term (Months)',
              prefixIcon: const Icon(Icons.calendar_month),
            ),
            onChanged: (_) => _calculate(),
          ),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFF10B981).withAlpha(20),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: const Color(0xFF10B981).withAlpha(50)),
            ),
            child: Row(
              children: [
                const Icon(Icons.info_outline, color: Color(0xFF10B981), size: 20),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    isKhmer
                        ? 'ការគណនានេះប្រើប្រាស់រូបមន្តស្ដង់ដារសម្រាប់ស្ថាប័នមីក្រូហិរញ្ញវត្ថុ និងធនាគារនៅកម្ពុជា។'
                        : 'Calculated using standard NBC & Cambodian MFI reducing balance methodology.',
                    style: const TextStyle(fontSize: 12, color: Color(0xFF047857)),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// -------------------------------------------------------------
// TAB 2: COMPOUND GROWTH
// -------------------------------------------------------------
class _CompoundGrowthTab extends StatefulWidget {
  final String langCode;
  const _CompoundGrowthTab({required this.langCode});

  @override
  State<_CompoundGrowthTab> createState() => _CompoundGrowthTabState();
}

class _CompoundGrowthTabState extends State<_CompoundGrowthTab> {
  final _initialCtrl = TextEditingController(text: '1000');
  final _monthlyCtrl = TextEditingController(text: '100');
  final _rateCtrl = TextEditingController(text: '8');
  final _yearsCtrl = TextEditingController(text: '5');

  double _futureValue = 0;
  double _totalDeposited = 0;
  double _interestEarned = 0;

  @override
  void initState() {
    super.initState();
    _calculate();
  }

  void _calculate() {
    final p = double.tryParse(_initialCtrl.text) ?? 0;
    final pmt = double.tryParse(_monthlyCtrl.text) ?? 0;
    final r = (double.tryParse(_rateCtrl.text) ?? 0) / 100 / 12;
    final n = (int.tryParse(_yearsCtrl.text) ?? 0) * 12;

    if (n <= 0) return;

    double fv = p * pow(1 + r, n);
    if (r > 0) {
      fv += pmt * ((pow(1 + r, n) - 1) / r);
    } else {
      fv += pmt * n;
    }
    final deposited = p + (pmt * n);
    final interest = fv - deposited;

    setState(() {
      _futureValue = fv;
      _totalDeposited = deposited;
      _interestEarned = interest;
    });
  }

  @override
  Widget build(BuildContext context) {
    final isKhmer = widget.langCode == 'km';

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Card(
            color: const Color(0xFF0F172A),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Text(
                    isKhmer ? 'តម្លៃសរុបនាពេលអនាគត' : 'Projected Future Value',
                    style: const TextStyle(color: Colors.white70, fontSize: 13),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '\$ ${_futureValue.toStringAsFixed(2)}',
                    style: const TextStyle(
                      color: Color(0xFF10B981),
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const Divider(color: Colors.white24, height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      Column(
                        children: [
                          Text(
                            isKhmer ? 'ប្រាក់ដើមដាក់សន្សំ' : 'Principal Deposited',
                            style: const TextStyle(color: Colors.white60, fontSize: 12),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '\$ ${_totalDeposited.toStringAsFixed(2)}',
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                      Column(
                        children: [
                          Text(
                            isKhmer ? 'ការប្រាក់ចំណេញ' : 'Total Interest',
                            style: const TextStyle(color: Colors.white60, fontSize: 12),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '\$ ${_interestEarned.toStringAsFixed(2)}',
                            style: const TextStyle(
                              color: Colors.amberAccent,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _initialCtrl,
            keyboardType: TextInputType.number,
            decoration: InputDecoration(
              labelText: isKhmer ? 'ប្រាក់សន្សំដំបូង (\$)' : 'Initial Investment (\$)',
              prefixIcon: const Icon(Icons.savings_outlined),
            ),
            onChanged: (_) => _calculate(),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _monthlyCtrl,
            keyboardType: TextInputType.number,
            decoration: InputDecoration(
              labelText: isKhmer ? 'ប្រាក់សន្សំបន្ថែមប្រចាំខែ (\$)' : 'Monthly Contribution (\$)',
              prefixIcon: const Icon(Icons.add_circle_outline),
            ),
            onChanged: (_) => _calculate(),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _rateCtrl,
            keyboardType: TextInputType.number,
            decoration: InputDecoration(
              labelText: isKhmer ? 'អត្រាផលចំណេញប្រចាំឆ្នាំ (%)' : 'Annual Return Rate (%)',
              prefixIcon: const Icon(Icons.show_chart),
            ),
            onChanged: (_) => _calculate(),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _yearsCtrl,
            keyboardType: TextInputType.number,
            decoration: InputDecoration(
              labelText: isKhmer ? 'រយៈពេល (ឆ្នាំ)' : 'Time Period (Years)',
              prefixIcon: const Icon(Icons.timelapse),
            ),
            onChanged: (_) => _calculate(),
          ),
        ],
      ),
    );
  }
}

// -------------------------------------------------------------
// TAB 3: 50/30/20 BUDGETING
// -------------------------------------------------------------
class _BudgetingTab extends StatefulWidget {
  final String langCode;
  const _BudgetingTab({required this.langCode});

  @override
  State<_BudgetingTab> createState() => _BudgetingTabState();
}

class _BudgetingTabState extends State<_BudgetingTab> {
  final _incomeCtrl = TextEditingController(text: '800');

  @override
  Widget build(BuildContext context) {
    final income = double.tryParse(_incomeCtrl.text) ?? 0;
    final needs = income * 0.50;
    final wants = income * 0.30;
    final savings = income * 0.20;

    final isKhmer = widget.langCode == 'km';

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextField(
            controller: _incomeCtrl,
            keyboardType: TextInputType.number,
            decoration: InputDecoration(
              labelText: isKhmer ? 'ចំណូលសុទ្ធប្រចាំខែ (\$)' : 'Monthly Net Income (\$)',
              prefixIcon: const Icon(Icons.account_balance_wallet_outlined),
            ),
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 20),
          _buildBudgetCard(
            title: isKhmer ? 'តម្រូវការចាំបាច់ (៥០%)' : 'Needs (50%)',
            description: isKhmer ? 'ផ្ទះ ម្ហូបអាហារ ទឹកភ្លើង ការធ្វើដំណើរ' : 'Housing, food, utilities, transport',
            usd: needs,
            color: const Color(0xFF2563EB),
          ),
          const SizedBox(height: 12),
          _buildBudgetCard(
            title: isKhmer ? 'បំណងប្រាថ្នា (៣០%)' : 'Wants (30%)',
            description: isKhmer ? 'ការកម្សាន្ត ញ៉ាំខាងក្រៅ ទិញទំនិញ' : 'Dining out, entertainment, hobbies',
            usd: wants,
            color: const Color(0xFFF59E0B),
          ),
          const SizedBox(height: 12),
          _buildBudgetCard(
            title: isKhmer ? 'ការសន្សំ & សងបំណុល (២០%)' : 'Savings & Debt (20%)',
            description: isKhmer ? 'មូលនិធិបន្ទាន់ វិនិយោគ សងប្រាក់កម្ចី' : 'Emergency fund, investments, extra debt payoff',
            usd: savings,
            color: const Color(0xFF10B981),
          ),
        ],
      ),
    );
  }

  Widget _buildBudgetCard({
    required String title,
    required String description,
    required double usd,
    required Color color,
  }) {
    final khr = (usd * 4100).round();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              width: 4,
              height: 56,
              decoration: BoxDecoration(
                color: color,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                  const SizedBox(height: 2),
                  Text(description, style: TextStyle(color: Colors.grey[600], fontSize: 12)),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  '\$ ${usd.toStringAsFixed(0)}',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: color),
                ),
                Text(
                  '≈ ${khr.toString()} ៛',
                  style: TextStyle(color: Colors.grey[500], fontSize: 11),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// -------------------------------------------------------------
// TAB 4: USD ↔ KHR LIVE CONVERTER
// -------------------------------------------------------------
class _CurrencyConverterTab extends StatefulWidget {
  final String langCode;
  const _CurrencyConverterTab({required this.langCode});

  @override
  State<_CurrencyConverterTab> createState() => _CurrencyConverterTabState();
}

class _CurrencyConverterTabState extends State<_CurrencyConverterTab> {
  final _usdCtrl = TextEditingController(text: '100');
  final _khrCtrl = TextEditingController(text: '410000');
  static const double _rate = 4100.0;

  void _onUsdChanged(String val) {
    final usd = double.tryParse(val) ?? 0;
    _khrCtrl.text = (usd * _rate).round().toString();
  }

  void _onKhrChanged(String val) {
    final khr = double.tryParse(val) ?? 0;
    _usdCtrl.text = (khr / _rate).toStringAsFixed(2);
  }

  @override
  Widget build(BuildContext context) {
    final isKhmer = widget.langCode == 'km';

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Card(
            color: const Color(0xFF0F172A),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Text(
                    isKhmer ? 'អត្រាប្តូរប្រាក់យោងធនាគារជាតិនៃកម្ពុជា' : 'NBC Official Reference Rate',
                    style: const TextStyle(color: Colors.white70, fontSize: 12),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    '1 USD = 4,100 KHR',
                    style: TextStyle(
                      color: Color(0xFF10B981),
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),
          TextField(
            controller: _usdCtrl,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
              labelText: 'US Dollar (USD \$)',
              prefixIcon: Icon(Icons.attach_money),
            ),
            onChanged: _onUsdChanged,
          ),
          const SizedBox(height: 16),
          const Center(child: Icon(Icons.swap_vert, size: 32, color: Color(0xFF10B981))),
          const SizedBox(height: 16),
          TextField(
            controller: _khrCtrl,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
              labelText: 'Cambodian Riel (KHR ៛)',
              prefixIcon: Icon(Icons.currency_exchange),
            ),
            onChanged: _onKhrChanged,
          ),
          const SizedBox(height: 24),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              ActionChip(
                label: const Text('\$10'),
                onPressed: () {
                  _usdCtrl.text = '10';
                  _onUsdChanged('10');
                },
              ),
              ActionChip(
                label: const Text('\$50'),
                onPressed: () {
                  _usdCtrl.text = '50';
                  _onUsdChanged('50');
                },
              ),
              ActionChip(
                label: const Text('\$100'),
                onPressed: () {
                  _usdCtrl.text = '100';
                  _onUsdChanged('100');
                },
              ),
              ActionChip(
                label: const Text('100,000 ៛'),
                onPressed: () {
                  _khrCtrl.text = '100000';
                  _onKhrChanged('100000');
                },
              ),
              ActionChip(
                label: const Text('500,000 ៛'),
                onPressed: () {
                  _khrCtrl.text = '500000';
                  _onKhrChanged('500000');
                },
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// -------------------------------------------------------------
// TAB 5: CAMBODIAN FINTECH GLOSSARY
// -------------------------------------------------------------
class _FintechGlossaryTab extends StatefulWidget {
  final String langCode;
  const _FintechGlossaryTab({required this.langCode});

  @override
  State<_FintechGlossaryTab> createState() => _FintechGlossaryTabState();
}

class _FintechGlossaryTabState extends State<_FintechGlossaryTab> {
  final _searchCtrl = TextEditingController();
  String _query = '';

  static const List<Map<String, String>> _terms = [
    {
      'term': 'KHQR',
      'titleKm': 'ស្តង់ដារ KHQR',
      'descEn': 'Standardized Cambodian QR code developed by the National Bank of Cambodia, enabling interoperable cross-bank mobile payments across all member financial institutions.',
      'descKm': 'ស្តង់ដារកូដ QR រួមរបស់ធនាគារជាតិនៃកម្ពុជា ដែលអនុញ្ញាតឱ្យទូទាត់ប្រាក់ឆ្លងធនាគារ និងគ្រឹះស្ថានហិរញ្ញវត្ថុទាំងអស់បានយ៉ាងងាយស្រួល។',
    },
    {
      'term': 'Bakong',
      'titleKm': 'ប្រព័ន្ធបាគង',
      'descEn': 'National payment gateway and digital currency system operated by the National Bank of Cambodia, built on Hyperledger Iroha blockchain technology.',
      'descKm': 'ប្រព័ន្ធទូទាត់ជាតិ និងរូបិយវត្ថុឌីជីថលបង្កើតឡើងដោយធនាគារជាតិនៃកម្ពុជា ផ្អែកលើបច្ចេកវិទ្យាប្លុកឆេន Hyperledger Iroha។',
    },
    {
      'term': 'NBC',
      'titleKm': 'ធនាគារជាតិនៃកម្ពុជា',
      'descEn': 'National Bank of Cambodia — The central bank responsible for monetary policy, financial regulation, and supervising commercial banks and MFIs.',
      'descKm': 'ធនាគារកណ្តាលទទួលខុសត្រូវលើគោលនយោបាយរូបិយវត្ថុ បទប្បញ្ញត្តិហិរញ្ញវត្ថុ និងការត្រួតពិនិត្យធនាគារពាណិជ្ជ និងមីក្រូហិរញ្ញវត្ថុ។',
    },
    {
      'term': 'CBC',
      'titleKm': 'ក្រុមហ៊ុនក្រេឌីតប្យួរ៉ូ (Credit Bureau Cambodia)',
      'descEn': 'Credit Bureau Cambodia provides credit reports and scores for borrowers to enhance financial transparency and prevent over-indebtedness.',
      'descKm': 'ផ្តល់របាយការណ៍ និងពិន្ទុឥណទានរបស់អ្នកខ្ចី ដើម្បីបង្កើនតម្លាភាពហិរញ្ញវត្ថុ និងទប់ស្កាត់បញ្ហាបំណុលវណ្ឌក។',
    },
    {
      'term': 'EMI',
      'titleKm': 'ការបង់ប្រាក់ស្មើប្រចាំខែ (Equated Monthly Installment)',
      'descEn': 'Equated Monthly Installment — A fixed payment amount made by a borrower to a lender at a specified date each calendar month.',
      'descKm': 'ការបង់ប្រាក់ប្រចាំខែថេរដែលអ្នកខ្ចីត្រូវសងទៅស្ថាប័នផ្តល់កម្ចីក្នុងកាលបរិច្ឆេទកំណត់នៃខែនីមួយៗ។',
    },
    {
      'term': 'AML / CFT',
      'titleKm': 'ការប្រឆាំងការសម្អាតប្រាក់ និងហិរញ្ញប្បទានភេរវកម្ម',
      'descEn': 'Anti-Money Laundering & Counter-Financing of Terrorism compliance laws enforced by CAFIU and the NBC.',
      'descKm': 'បទប្បញ្ញត្តិច្បាប់ប្រឆាំងការសម្អាតប្រាក់ និងហិរញ្ញប្បទានភេរវកម្ម ក្រោមការត្រួតពិនិត្យរបស់ CAFIU និងធនាគារជាតិនៃកម្ពុជា។',
    },
  ];

  @override
  Widget build(BuildContext context) {
    final isKhmer = widget.langCode == 'km';
    final filtered = _terms.where((item) {
      final term = item['term']!.toLowerCase();
      final titleKm = item['titleKm']!.toLowerCase();
      final descEn = item['descEn']!.toLowerCase();
      final descKm = item['descKm']!.toLowerCase();
      final q = _query.toLowerCase();
      return term.contains(q) || titleKm.contains(q) || descEn.contains(q) || descKm.contains(q);
    }).toList();

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: TextField(
            controller: _searchCtrl,
            decoration: InputDecoration(
              hintText: isKhmer ? 'ស្វែងរកពាក្យបច្ចេកទេស...' : 'Search fintech terms...',
              prefixIcon: const Icon(Icons.search),
              suffixIcon: _query.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: () {
                        _searchCtrl.clear();
                        setState(() => _query = '');
                      },
                    )
                  : null,
            ),
            onChanged: (val) => setState(() => _query = val),
          ),
        ),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: filtered.length,
            itemBuilder: (context, index) {
              final item = filtered[index];
              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: const Color(0xFF10B981).withAlpha(25),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              item['term']!,
                              style: const TextStyle(
                                color: Color(0xFF10B981),
                                fontWeight: FontWeight.bold,
                                fontSize: 14,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              item['titleKm']!,
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        isKhmer ? item['descKm']! : item['descEn']!,
                        style: TextStyle(color: Colors.grey[700], fontSize: 13, height: 1.4),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}
