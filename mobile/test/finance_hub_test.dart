import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:elms_mobile/presentation/blocs/locale/locale_cubit.dart';
import 'package:elms_mobile/core/localization.dart';

void main() {
  group('Finance Calculations Unit Tests', () {
    test('Loan EMI amortization calculation matches banking standard', () {
      const principal = 10000.0;
      const annualRate = 12.0;
      const months = 24;

      const monthlyRate = (annualRate / 100) / 12;
      final emi = (principal * monthlyRate * pow(1 + monthlyRate, months)) /
          (pow(1 + monthlyRate, months) - 1);

      // Expected EMI is approximately $470.73
      expect(emi, closeTo(470.73, 0.05));

      final totalPayment = emi * months;
      final totalInterest = totalPayment - principal;

      expect(totalPayment, closeTo(11297.63, 0.5));
      expect(totalInterest, closeTo(1297.63, 0.5));
    });

    test('50/30/20 Budgeting distribution allocates accurately', () {
      const netIncome = 1200.0;
      const needs = netIncome * 0.50;
      const wants = netIncome * 0.30;
      const savings = netIncome * 0.20;

      expect(needs, equals(600.0));
      expect(wants, equals(360.0));
      expect(savings, equals(240.0));

      // KHR conversion (4,100 KHR benchmark)
      expect((needs * 4100).round(), equals(2460000));
      expect((wants * 4100).round(), equals(1476000));
      expect((savings * 4100).round(), equals(984000));
    });

    test('USD to KHR conversion uses 4,100 KHR NBC reference rate', () {
      const rate = 4100.0;
      const usdAmount = 50.0;
      final khrAmount = (usdAmount * rate).round();

      expect(khrAmount, equals(205000));

      final convertedBack = khrAmount / rate;
      expect(convertedBack, equals(50.0));
    });
  });

  group('Locale and Localization Unit Tests', () {
    test('AppStrings retrieves authentic translations for English and Khmer', () {
      expect(AppStrings.get('nav_finance_hub', 'en'), equals('Finance Hub'));
      expect(AppStrings.get('nav_finance_hub', 'km'), equals('ឧបករណ៍ហិរញ្ញវត្ថុ'));
      expect(AppStrings.get('khqr_pay', 'km'), equals('ទូទាត់តាម KHQR'));
    });

    test('LocaleCubit updates locale and data saver preference', () async {
      SharedPreferences.setMockInitialValues({});
      final cubit = LocaleCubit();

      expect(cubit.state.locale.languageCode, equals('en'));
      expect(cubit.state.isDataSaver, isFalse);

      await cubit.setLocale(const Locale('km'));
      expect(cubit.state.locale.languageCode, equals('km'));

      await cubit.toggleDataSaver();
      expect(cubit.state.isDataSaver, isTrue);
    });
  });
}
