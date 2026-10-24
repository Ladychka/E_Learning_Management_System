import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../blocs/assignment/assignment_cubit.dart';

class AssignmentDetailScreen extends StatefulWidget {
  final String assignmentId;
  const AssignmentDetailScreen({super.key, required this.assignmentId});

  @override
  State<AssignmentDetailScreen> createState() => _AssignmentDetailScreenState();
}

class _AssignmentDetailScreenState extends State<AssignmentDetailScreen> {
  @override
  void initState() {
    super.initState();
    context.read<AssignmentCubit>().fetchAssignmentDetail(widget.assignmentId);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Assignment'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: BlocBuilder<AssignmentCubit, AssignmentState>(
        builder: (context, state) {
          if (state is AssignmentLoading) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state is AssignmentDetailLoaded) {
            final a = state.assignment;
            final submission = a.latestSubmission;
            final isOverdue = a.isOverdue && !a.allowLate;

            return SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    a.title,
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Icon(Icons.star, size: 16, color: Colors.amber[700]),
                      const SizedBox(width: 4),
                      Text('${a.maxPoints} points'),
                      if (a.dueDate != null) ...[
                        const SizedBox(width: 16),
                        Icon(Icons.event, size: 16, color: Colors.grey[600]),
                        const SizedBox(width: 4),
                        Text(
                          'Due ${DateFormat.yMMMd().add_jm().format(a.dueDate!)}',
                          style: TextStyle(
                            color: a.isOverdue ? Colors.red : Colors.grey[600],
                          ),
                        ),
                      ],
                    ],
                  ),
                  if (a.isOverdue) ...[
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.red[50],
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        a.allowLate
                            ? 'Overdue — late submission allowed'
                            : 'Overdue — submission closed',
                        style: TextStyle(
                          color: Colors.red[800],
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                  const SizedBox(height: 24),
                  if (a.description != null) ...[
                    Text(
                      'Description',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                    const SizedBox(height: 8),
                    Text(a.description!),
                    const SizedBox(height: 16),
                  ],
                  if (a.instructions != null) ...[
                    Text(
                      'Instructions',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                    const SizedBox(height: 8),
                    Text(a.instructions!),
                    const SizedBox(height: 16),
                  ],
                  if (a.attachments.isNotEmpty) ...[
                    Text(
                      'Attachments',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                    const SizedBox(height: 8),
                    ...a.attachments.map((url) => ListTile(
                      leading: const Icon(Icons.attach_file),
                      title: Text(url.toString().split('/').last),
                      trailing: const Icon(Icons.open_in_new, size: 18),
                    )),
                    const SizedBox(height: 16),
                  ],
                  // Submission status
                  if (submission != null) ...[
                    const Divider(),
                    const SizedBox(height: 16),
                    Text(
                      'Your Submission',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                    const SizedBox(height: 12),
                    Card(
                      color: Colors.green[50],
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Icon(Icons.check_circle,
                                    color: Colors.green),
                                const SizedBox(width: 8),
                                Text(
                                  'Submitted',
                                  style: TextStyle(
                                    color: Colors.green[800],
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                            if (submission.isLate)
                              Padding(
                                padding: const EdgeInsets.only(top: 4),
                                child: Text(
                                  'Late submission',
                                  style: TextStyle(
                                    color: Colors.orange[800],
                                    fontSize: 12,
                                  ),
                                ),
                              ),
                            const SizedBox(height: 8),
                            Text(
                              'Submitted on ${DateFormat.yMMMd().add_jm().format(submission.submittedAt)}',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey[600],
                              ),
                            ),
                            if (submission.points != null) ...[
                              const SizedBox(height: 12),
                              Text(
                                'Score: ${submission.points} / ${a.maxPoints}',
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                            if (submission.feedback != null &&
                                submission.feedback!.isNotEmpty) ...[
                              const SizedBox(height: 8),
                              Text(
                                'Feedback: ${submission.feedback}',
                                style: TextStyle(
                                  color: Colors.grey[700],
                                  fontSize: 13,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                  ] else if (!isOverdue) ...[
                    const SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton.icon(
                        onPressed: () => _showSubmissionSheet(context, a.id),
                        icon: const Icon(Icons.upload_file),
                        label: const Text('Submit Assignment'),
                      ),
                    ),
                  ],
                ],
              ),
            );
          }
          if (state is AssignmentError) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(state.message),
                  const SizedBox(height: 8),
                  ElevatedButton(
                    onPressed: () => context
                        .read<AssignmentCubit>()
                        .fetchAssignmentDetail(widget.assignmentId),
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          }
          return const SizedBox.shrink();
        },
      ),
    );
  }

  void _showSubmissionSheet(BuildContext context, String assignmentId) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) => _SubmissionSheet(assignmentId: assignmentId),
    );
  }
}

class _SubmissionSheet extends StatefulWidget {
  final String assignmentId;
  const _SubmissionSheet({required this.assignmentId});

  @override
  State<_SubmissionSheet> createState() => _SubmissionSheetState();
}

class _SubmissionSheetState extends State<_SubmissionSheet> {
  final _contentCtrl = TextEditingController();
  bool _submitting = false;

  @override
  void dispose() {
    _contentCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
        left: 16,
        right: 16,
        top: 16,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              const Text(
                'Submit Assignment',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const Spacer(),
              IconButton(
                icon: const Icon(Icons.close),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _contentCtrl,
            maxLines: 5,
            decoration: const InputDecoration(
              hintText: 'Enter your answer or notes...',
              alignLabelWithHint: true,
            ),
          ),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: _submitting ? null : _submit,
            icon: _submitting
                ? const SizedBox(
                    height: 18,
                    width: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : const Icon(Icons.send),
            label: Text(_submitting ? 'Submitting...' : 'Submit'),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Future<void> _submit() async {
    setState(() => _submitting = true);
    try {
      await context.read<AssignmentCubit>().submitAssignment(
            assignmentId: widget.assignmentId,
            content: _contentCtrl.text.trim(),
          );
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Assignment submitted successfully')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }
}
