import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../blocs/auth/auth_cubit.dart';
import '../blocs/locale/locale_cubit.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final user = context.select(
      (AuthCubit cubit) =>
          cubit.state is AuthAuthenticated
              ? (cubit.state as AuthAuthenticated).user
              : null,
    );

    return BlocListener<AuthCubit, AuthState>(
      listener: (context, state) {
        if (state is AuthUnauthenticated) {
          context.go('/login');
        }
      },
      child: Scaffold(
        appBar: AppBar(title: const Text('My Profile')),
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              CircleAvatar(
                radius: 48,
                backgroundColor: const Color(0xFFDBEAFE),
                child: Builder(
                  builder: (_) {
                    final fn = user?.firstName ?? '';
                    final ln = user?.lastName ?? '';
                    return Text(
                      '${fn.isNotEmpty ? fn[0] : ''}${ln.isNotEmpty ? ln[0] : ''}',
                      style: const TextStyle(
                        fontSize: 32,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF2563EB),
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 16),
              Text(
                user?.displayName ?? '',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
              ),
              const SizedBox(height: 4),
              Text(
                user?.email ?? '',
                style: TextStyle(color: Colors.grey[600]),
              ),
              const SizedBox(height: 4),
              Chip(
                label: Text(
                  (user?.role ?? 'STUDENT').toLowerCase(),
                ),
                backgroundColor: Colors.blue[50],
                labelStyle: TextStyle(color: Colors.blue[800]),
              ),
              const SizedBox(height: 24),
              Card(
                child: Column(
                  children: [
                    ListTile(
                      leading: const Icon(Icons.edit),
                      title: const Text('Edit Profile'),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => context.push('/profile/edit'),
                    ),
                    const Divider(height: 1),
                    ListTile(
                      leading: const Icon(Icons.lock_outline),
                      title: const Text('Change Password'),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => context.push('/profile/change-password'),
                    ),
                    const Divider(height: 1),
                    ListTile(
                      leading: const Icon(Icons.school_outlined),
                      title: const Text('My Enrollments'),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => context.go('/enrollments'),
                    ),
                    const Divider(height: 1),
                    ListTile(
                      leading: const Icon(Icons.emoji_events_outlined),
                      title: const Text('My Grades'),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => context.push('/grades'),
                    ),
                    const Divider(height: 1),
                    ListTile(
                      leading: const Icon(Icons.receipt_long_outlined),
                      title: const Text('Payment History'),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => context.push('/payments/history'),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Card(
                child: Column(
                  children: [
                    ListTile(
                      leading: const Icon(Icons.translate),
                      title: const Text('Language / ភាសា'),
                      subtitle: Text(
                        context.watch<LocaleCubit>().state.locale.languageCode == 'km'
                            ? 'ភាសាខ្មែរ (Khmer)'
                            : 'English (US)',
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => _showLanguageDialog(context),
                    ),
                    const Divider(height: 1),
                    SwitchListTile(
                      secondary: const Icon(Icons.network_check),
                      title: const Text('Data Saver Mode'),
                      subtitle: const Text('Optimizes images and video bandwidth'),
                      value: context.watch<LocaleCubit>().state.isDataSaver,
                      activeThumbColor: const Color(0xFF10B981),
                      onChanged: (_) {
                        context.read<LocaleCubit>().toggleDataSaver();
                      },
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () => _confirmLogout(context),
                  icon: const Icon(Icons.logout, color: Colors.red),
                  label: const Text(
                    'Logout',
                    style: TextStyle(color: Colors.red),
                  ),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Colors.red),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _confirmLogout(BuildContext context) {
    showDialog(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        title: const Text('Logout'),
        content: const Text('Are you sure you want to sign out?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogCtx).pop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () async {
              Navigator.of(dialogCtx).pop();
              await context.read<AuthCubit>().logout();
              if (context.mounted) {
                context.go('/login');
              }
            },
            child: const Text('Logout'),
          ),
        ],
      ),
    );
  }

  void _showLanguageDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        title: const Text('Select Language / ជ្រើសរើសភាសា'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.language),
              title: const Text('English (US)'),
              onTap: () {
                context.read<LocaleCubit>().setLocale(const Locale('en'));
                Navigator.of(dialogCtx).pop();
              },
            ),
            const Divider(height: 1),
            ListTile(
              leading: const Icon(Icons.language),
              title: const Text('ភាសាខ្មែរ (Khmer)'),
              onTap: () {
                context.read<LocaleCubit>().setLocale(const Locale('km'));
                Navigator.of(dialogCtx).pop();
              },
            ),
          ],
        ),
      ),
    );
  }
}
