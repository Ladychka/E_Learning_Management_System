import 'package:flutter/material.dart';

class AppLocale {
  final String code;
  final String name;
  final String nativeName;
  final String flag;

  const AppLocale({
    required this.code,
    required this.name,
    required this.nativeName,
    required this.flag,
  });

  static const en = AppLocale(code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸');
  static const km = AppLocale(code: 'km', name: 'Khmer', nativeName: 'ភាសាខ្មែរ', flag: '🇰🇭');

  static const supportedLocales = [Locale('en'), Locale('km')];
}

class AppStrings {
  static const Map<String, Map<String, String>> _localizedValues = {
    'en': {
      'app_title': 'ELMS Fintech Learning',
      'nav_dashboard': 'Dashboard',
      'nav_courses': 'Courses',
      'nav_finance_hub': 'Finance Hub',
      'nav_enrollments': 'Enrollments',
      'nav_profile': 'Profile',
      'language': 'Language',
      'switch_language': 'Switch Language',
      'data_saver': 'Data Saver Mode',
      'data_saver_desc': 'Reduces video resolution and image bandwidth',
      'search_courses': 'Search fintech courses...',
      'filter': 'Filter',
      'all_levels': 'All Levels',
      'free': 'Free',
      'paid': 'Paid',
      'khqr_pay': 'KHQR Payment',
      'bakong_pay': 'Bakong Wallet',
      'aba_pay': 'ABA PayWay',
      'scan_to_pay': 'Scan to Pay with Bakong / Banking App',
      'nbc_disclaimer': 'Educational simulation aligned with National Bank of Cambodia standards.',
      'loan_calculator': 'Loan / EMI Calculator',
      'compound_calculator': 'Compound Growth',
      'budget_calculator': '50/30/20 Budgeting',
      'currency_converter': 'USD ↔ KHR Converter',
      'fintech_glossary': 'Fintech Glossary',
      'offline_banner': 'No internet connection. Some features may be limited.',
      'retry': 'Retry',
      'completed': 'Completed',
      'in_progress': 'In Progress',
    },
    'km': {
      'app_title': 'ប្រព័ន្ធសិក្សាហិរញ្ញវត្ថុ ELMS',
      'nav_dashboard': 'ផ្ទាំងគ្រប់គ្រង',
      'nav_courses': 'វគ្គសិក្សា',
      'nav_finance_hub': 'ឧបករណ៍ហិរញ្ញវត្ថុ',
      'nav_enrollments': 'ការចុះឈ្មោះ',
      'nav_profile': 'គណនី',
      'language': 'ភាសា',
      'switch_language': 'ប្តូរភាសា',
      'data_saver': 'មុខងារសន្សំទិន្នន័យ',
      'data_saver_desc': 'កាត់បន្ថយកម្រិតភាពច្បាស់វីដេអូដើម្បីសន្សំទិន្នន័យ',
      'search_courses': 'ស្វែងរកវគ្គសិក្សាហិរញ្ញវត្ថុ...',
      'filter': 'តម្រង',
      'all_levels': 'គ្រប់កម្រិត',
      'free': 'ឥតគិតថ្លៃ',
      'paid': 'បង់ថ្លៃ',
      'khqr_pay': 'ទូទាត់តាម KHQR',
      'bakong_pay': 'កាបូបបាគង',
      'aba_pay': 'ABA PayWay',
      'scan_to_pay': 'ស្កេនទូទាត់ជាមួយបាគង ឬកម្មវិធីធនាគារ',
      'nbc_disclaimer': 'ការក្លែងធ្វើអប់រំស្របតាមបទដ្ឋានធនាគារជាតិនៃកម្ពុជា។',
      'loan_calculator': 'គណនាកម្ចី និងការបង់ប្រចាំខែ',
      'compound_calculator': 'ការប្រាក់រួមផ្សំ',
      'budget_calculator': 'ផែនការថវិកា ៥០/៣០/២០',
      'currency_converter': 'ប្តូរប្រាក់ ដុល្លារ ↔ រៀល',
      'fintech_glossary': 'សទ្ទានុក្រមបច្ចេកវិទ្យាហិរញ្ញវត្ថុ',
      'offline_banner': 'មិនមានការតភ្ជាប់អ៊ីនធឺណិតទេ។ មុខងារមួយចំនួនអាចមានកម្រិត។',
      'retry': 'ព្យាយាមម្តងទៀត',
      'completed': 'បានបញ្ចប់',
      'in_progress': 'កំពុងសិក្សា',
    },
  };

  static String get(String key, [String langCode = 'en']) {
    return _localizedValues[langCode]?[key] ?? _localizedValues['en']?[key] ?? key;
  }
}
