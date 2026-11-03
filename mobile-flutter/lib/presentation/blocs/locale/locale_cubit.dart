import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shared_preferences/shared_preferences.dart';

class LocaleState {
  final Locale locale;
  final bool isDataSaver;

  const LocaleState({
    required this.locale,
    this.isDataSaver = false,
  });

  LocaleState copyWith({
    Locale? locale,
    bool? isDataSaver,
  }) {
    return LocaleState(
      locale: locale ?? this.locale,
      isDataSaver: isDataSaver ?? this.isDataSaver,
    );
  }
}

class LocaleCubit extends Cubit<LocaleState> {
  static const _kLocaleKey = 'elms_mobile_locale';
  static const _kDataSaverKey = 'elms_mobile_datasaver';

  LocaleCubit() : super(const LocaleState(locale: Locale('en'))) {
    _loadPreferences();
  }

  Future<void> _loadPreferences() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final langCode = prefs.getString(_kLocaleKey) ?? 'en';
      final dataSaver = prefs.getBool(_kDataSaverKey) ?? false;
      emit(LocaleState(
        locale: Locale(langCode),
        isDataSaver: dataSaver,
      ));
    } catch (_) {}
  }

  Future<void> setLocale(Locale newLocale) async {
    emit(state.copyWith(locale: newLocale));
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_kLocaleKey, newLocale.languageCode);
    } catch (_) {}
  }

  Future<void> toggleDataSaver() async {
    final nextVal = !state.isDataSaver;
    emit(state.copyWith(isDataSaver: nextVal));
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(_kDataSaverKey, nextVal);
    } catch (_) {}
  }
}
