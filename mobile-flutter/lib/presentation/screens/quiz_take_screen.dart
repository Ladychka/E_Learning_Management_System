import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../data/models/quiz_model.dart';
import '../blocs/quiz/quiz_cubit.dart';

class QuizTakeScreen extends StatefulWidget {
  final String lessonId;
  final String quizId;
  const QuizTakeScreen({
    super.key,
    required this.lessonId,
    required this.quizId,
  });

  @override
  State<QuizTakeScreen> createState() => _QuizTakeScreenState();
}

class _QuizTakeScreenState extends State<QuizTakeScreen> {
  int _currentIndex = 0;
  final _shortAnswerCtrl = TextEditingController();
  String? _lastQuestionId;
  late final QuizCubit _quizCubit;

  @override
  void initState() {
    super.initState();
    _quizCubit = context.read<QuizCubit>();
    // Use the global QuizCubit; do NOT create a local shadow instance
    _quizCubit.startAttempt(widget.quizId);
  }

  @override
  void dispose() {
    // The cubit lives at app level; stop its timer/attempt when leaving the
    // screen so a quit quiz cannot be auto-submitted in the background.
    _quizCubit.reset();
    _shortAnswerCtrl.dispose();
    super.dispose();
  }

  void _syncShortAnswer(String? answer) {
    // Only update controller text when the question changes,
    // not on every build, to prevent cursor jumps.
    if (_lastQuestionId != _currentQuestionId) {
      _lastQuestionId = _currentQuestionId;
      _shortAnswerCtrl.text = answer ?? '';
    }
  }

  String? get _currentQuestionId {
    final state = context.read<QuizCubit>().state;
    if (state is QuizAttemptInProgress && _currentIndex < state.questions.length) {
      return state.questions[_currentIndex].id;
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<QuizCubit, QuizState>(
      listener: (context, state) {
        if (state is QuizAttemptCompleted) {
          context.pushReplacement(
            '/quiz-results/${state.attempt.id}',
          );
        }
        if (state is QuizError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(state.message)),
          );
        }
      },
      builder: (context, state) {
        if (state is QuizLoading) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }
        if (state is QuizAttemptInProgress) {
          return _buildQuizUI(context, state);
        }
        if (state is QuizError) {
          return Scaffold(
            appBar: AppBar(
              title: const Text('Quiz'),
              leading: IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () => context.pop(),
              ),
            ),
            body: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(state.message),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () => context
                        .read<QuizCubit>()
                        .startAttempt(widget.quizId),
                    child: const Text('Retry'),
                  ),
                ],
              ),
            ),
          );
        }
        return const Scaffold(body: SizedBox.shrink());
      },
    );
  }

  Widget _buildQuizUI(BuildContext context, QuizAttemptInProgress state) {
    final questions = state.questions;
    if (questions.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text('Quiz')),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.quiz_outlined, size: 64, color: Colors.grey),
              const SizedBox(height: 12),
              const Text('This quiz has no questions yet.'),
              const SizedBox(height: 12),
              FilledButton(
                onPressed: () {
                  _quizCubit.reset();
                  context.pop();
                },
                child: const Text('Go Back'),
              ),
            ],
          ),
        ),
      );
    }
    final currentQuestion = questions[_currentIndex];
    final total = questions.length;
    final answeredCount = state.answers.length;

    return Scaffold(
      appBar: AppBar(
        title: Text('Question ${_currentIndex + 1} / $total'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => _confirmQuit(context),
        ),
        actions: [
          if (state.attempt.timeLimit != null)
            Padding(
              padding: const EdgeInsets.only(right: 16),
              child: Center(
                child: Text(
                  state.formattedTime,
                  style: TextStyle(
                    color: state.isTimeLow ? Colors.red : null,
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
              ),
            ),
        ],
      ),
      body: Column(
        children: [
          // Progress bar
          LinearProgressIndicator(
            value: answeredCount / total,
            backgroundColor: Colors.grey[200],
          ),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    currentQuestion.question,
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '${currentQuestion.points} point${currentQuestion.points > 1 ? 's' : ''}',
                    style: TextStyle(color: Colors.grey[600], fontSize: 12),
                  ),
                  const SizedBox(height: 24),
                  if (currentQuestion.isMCQ || currentQuestion.isTrueFalse)
                    _buildOptions(context, state, currentQuestion)
                  else if (currentQuestion.isShortAnswer)
                    _buildShortAnswer(context, state, currentQuestion),
                ],
              ),
            ),
          ),
          // Navigation
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                if (_currentIndex > 0)
                  OutlinedButton(
                    onPressed: () => setState(() => _currentIndex--),
                    child: const Text('Previous'),
                  )
                else
                  const SizedBox(width: 80),
                const Spacer(),
                if (_currentIndex < total - 1)
                  FilledButton(
                    onPressed: () => setState(() => _currentIndex++),
                    child: const Text('Next'),
                  )
                else
                  FilledButton(
                    onPressed: () => _confirmSubmit(context, state),
                    child: const Text('Submit'),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOptions(
    BuildContext context,
    QuizAttemptInProgress state,
    Question question,
  ) {
    final selected = state.answers[question.id];
    final options = question.options.map((o) => o.toString()).toList();

    return Column(
      children: options.map((option) {
        final isSelected = selected == option;
        return Card(
          margin: const EdgeInsets.only(bottom: 8),
          color: isSelected ? Colors.blue[50] : null,
          child: ListTile(
            title: Text(option),
            trailing: isSelected
                ? const Icon(Icons.check_circle, color: Color(0xFF2563EB))
                : const Icon(Icons.circle_outlined, color: Colors.grey),
            onTap: () {
              context.read<QuizCubit>().answerQuestion(question.id, option);
            },
          ),
        );
      }).toList(),
    );
  }

  Widget _buildShortAnswer(
    BuildContext context,
    QuizAttemptInProgress state,
    Question question,
  ) {
    final currentAnswer = state.answers[question.id];
    _syncShortAnswer(currentAnswer);

    return TextField(
      controller: _shortAnswerCtrl,
      maxLines: 5,
      decoration: const InputDecoration(
        hintText: 'Type your answer here...',
        alignLabelWithHint: true,
      ),
      onChanged: (value) {
        context.read<QuizCubit>().answerQuestion(question.id, value);
      },
    );
  }

  void _confirmQuit(BuildContext context) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Quit Quiz?'),
        content: const Text(
            'Your progress will be lost. Are you sure you want to quit?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Continue'),
          ),
          FilledButton(
            onPressed: () {
              Navigator.pop(context);
              _quizCubit.reset();
              context.pop();
            },
            child: const Text('Quit'),
          ),
        ],
      ),
    );
  }

  void _confirmSubmit(BuildContext context, QuizAttemptInProgress state) {
    final unanswered = state.questions.length - state.answers.length;
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Submit Quiz?'),
        content: Text(
          unanswered > 0
              ? 'You have $unanswered unanswered question(s). Are you sure you want to submit?'
              : 'Are you sure you want to submit your answers?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Review'),
          ),
          FilledButton(
            onPressed: () {
              Navigator.pop(context);
              context.read<QuizCubit>().submitAttempt(state.attempt.id);
            },
            child: const Text('Submit'),
          ),
        ],
      ),
    );
  }
}
