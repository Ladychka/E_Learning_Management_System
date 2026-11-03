import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../blocs/quiz/quiz_cubit.dart';

class QuizResultsScreen extends StatefulWidget {
  final String attemptId;
  const QuizResultsScreen({super.key, required this.attemptId});

  @override
  State<QuizResultsScreen> createState() => _QuizResultsScreenState();
}

class _QuizResultsScreenState extends State<QuizResultsScreen> {
  @override
  void initState() {
    super.initState();
    context.read<QuizCubit>().fetchResults(widget.attemptId);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Quiz Results'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => context.pop(),
        ),
      ),
      body: BlocBuilder<QuizCubit, QuizState>(
        builder: (context, state) {
          if (state is QuizLoading || state is QuizInitial) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state is QuizAttemptCompleted) {
            final attempt = state.attempt;
            final score = attempt.score ?? 0;
            final maxScore = attempt.maxScore ?? 1;
            final percentage = attempt.percentage ?? 0;

            return SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  // Score circle
                  Container(
                    width: 140,
                    height: 140,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: _scoreColor(percentage).withAlpha(26),
                      border: Border.all(
                        color: _scoreColor(percentage),
                        width: 4,
                      ),
                    ),
                    child: Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            '$percentage%',
                            style: TextStyle(
                              fontSize: 32,
                              fontWeight: FontWeight.bold,
                              color: _scoreColor(percentage),
                            ),
                          ),
                          Text(
                            '$score / $maxScore',
                            style: TextStyle(
                              fontSize: 14,
                              color: Colors.grey[600],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    attempt.isCompleted ? 'Completed' : 'Timed Out',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: _scoreColor(percentage),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Attempt #${attempt.attemptNumber}',
                    style: TextStyle(color: Colors.grey[600]),
                  ),
                  const SizedBox(height: 24),
                  const Divider(),
                  const SizedBox(height: 16),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: Text(
                      'Answer Review',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  ...attempt.answers.map((answer) {
                    final question = answer.question;
                    if (question == null) return const SizedBox.shrink();

                    final isCorrect = answer.isCorrect;
                    final correctAnswer = question.correctAnswer;

                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    question.question,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                                if (isCorrect != null)
                                  Icon(
                                    isCorrect
                                        ? Icons.check_circle
                                        : Icons.cancel,
                                    color: isCorrect
                                        ? Colors.green
                                        : Colors.red,
                                  ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Your answer: ${answer.answer ?? '(empty)'}',
                              style: TextStyle(
                                color: isCorrect == false
                                    ? Colors.red
                                    : Colors.grey[700],
                              ),
                            ),
                            if (isCorrect == false &&
                                correctAnswer != null) ...[
                              const SizedBox(height: 4),
                              Text(
                                'Correct answer: $correctAnswer',
                                style: const TextStyle(
                                  color: Colors.green,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                            const SizedBox(height: 4),
                            Text(
                              '${answer.pointsEarned ?? 0} / ${question.points} pts',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey[600],
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: () => context.pop(),
                      child: const Text('Done'),
                    ),
                  ),
                ],
              ),
            );
          }
          if (state is QuizError) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(state.message),
                  const SizedBox(height: 8),
                  ElevatedButton(
                    onPressed: () => context
                        .read<QuizCubit>()
                        .fetchResults(widget.attemptId),
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

  Color _scoreColor(int percentage) {
    if (percentage >= 80) return Colors.green;
    if (percentage >= 60) return Colors.orange;
    return Colors.red;
  }
}
