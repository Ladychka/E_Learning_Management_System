import 'package:chewie/chewie.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:video_player/video_player.dart';

import '../../core/constants.dart';
import '../../data/services/api_service.dart';

class LessonPlayerScreen extends StatefulWidget {
  final String lessonId;
  const LessonPlayerScreen({super.key, required this.lessonId});

  @override
  State<LessonPlayerScreen> createState() => _LessonPlayerScreenState();
}

class _LessonPlayerScreenState extends State<LessonPlayerScreen> {
  final ApiService _api = ApiService();
  bool _loading = true;
  String? _error;
  Map<String, dynamic>? _lesson;
  bool _isLandscape = false;

  // Video player
  VideoPlayerController? _videoController;
  ChewieController? _chewieController;

  @override
  void initState() {
    super.initState();
    _fetchLesson();
  }

  Future<void> _fetchLesson() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await _api.get('/lessons/${widget.lessonId}');
      final lessonData = res.data['data'] as Map<String, dynamic>;
      if (!mounted) return;
      setState(() {
        _lesson = lessonData;
        _loading = false;
      });
      _initVideoPlayer();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  void _initVideoPlayer() {
    final contentType = _lesson?['contentType'] as String?;
    final contentUrl = _lesson?['contentUrl'] as String?;
    if (contentType != 'video' || contentUrl == null) return;

    final url = _resolveUrl(contentUrl);
    _videoController = VideoPlayerController.networkUrl(Uri.parse(url));
    _videoController!.initialize().then((_) {
      if (mounted) {
        setState(() {
          _chewieController = ChewieController(
            videoPlayerController: _videoController!,
            autoPlay: true,
            looping: false,
            aspectRatio: _videoController!.value.aspectRatio,
            allowedScreenSleep: false,
          );
        });
      }
    });
  }

  String _resolveUrl(String? path) {
    if (path == null) return '';
    if (path.startsWith('http')) return path;
    return '${ApiConstants.baseUrl.replaceAll('/api/v1', '')}$path';
  }

  void _toggleFullscreen() {
    setState(() => _isLandscape = !_isLandscape);
    if (_isLandscape) {
      SystemChrome.setPreferredOrientations([
        DeviceOrientation.landscapeLeft,
        DeviceOrientation.landscapeRight,
      ]);
      SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    } else {
      SystemChrome.setPreferredOrientations([
        DeviceOrientation.portraitUp,
      ]);
      SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    }
  }

  @override
  void dispose() {
    _videoController?.dispose();
    _chewieController?.dispose();
    SystemChrome.setPreferredOrientations([
      DeviceOrientation.portraitUp,
    ]);
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (_error != null) {
      return Scaffold(
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(_error!),
              const SizedBox(height: 8),
              ElevatedButton(
                onPressed: _fetchLesson,
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    final lesson = _lesson!;
    final title = lesson['title'] as String? ?? 'Lesson';
    final contentType = lesson['contentType'] as String? ?? 'text';
    final contentUrl = lesson['contentUrl'] as String?;
    final description = lesson['description'] as String?;

    final modules =
        (lesson['module']?['course']?['modules'] as List<dynamic>? ?? [])
            .cast<Map<String, dynamic>>();

    return Scaffold(
      appBar: _isLandscape
          ? null
          : AppBar(
              title: Text(title, overflow: TextOverflow.ellipsis),
              actions: [
                if (contentType == 'video')
                  IconButton(
                    icon: Icon(_isLandscape
                        ? Icons.fullscreen_exit
                        : Icons.fullscreen),
                    onPressed: _toggleFullscreen,
                  ),
              ],
            ),
      body: Column(
        children: [
          // Content Area
          if (contentType == 'video' && contentUrl != null)
            AspectRatio(
              aspectRatio: _isLandscape
                  ? (_videoController != null && _videoController!.value.isInitialized
                      ? _videoController!.value.aspectRatio
                      : 16 / 9)
                  : (_videoController != null && _videoController!.value.isInitialized
                      ? _videoController!.value.aspectRatio
                      : 16 / 9),
              child: Container(
                color: Colors.black,
                child: _chewieController != null &&
                        _videoController != null &&
                        _videoController!.value.isInitialized
                    ? Chewie(controller: _chewieController!)
                    : const Center(
                        child: CircularProgressIndicator(color: Colors.white),
                      ),
              ),
            )
          else if (contentType == 'pdf' && contentUrl != null)
            Expanded(
              child: _buildPdfViewer(context, contentUrl),
            )
          else if (contentType == 'text')
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Text(
                  contentUrl?.isNotEmpty == true
                      ? contentUrl!
                      : 'No text content yet.',
                  style: Theme.of(context).textTheme.bodyLarge,
                ),
              ),
            )
          else if (contentType == 'quiz')
            Expanded(
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.quiz, size: 64, color: Color(0xFF2563EB)),
                    const SizedBox(height: 12),
                    Text(
                      'Quiz: $title',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Take the quiz to test your knowledge',
                      style: TextStyle(color: Colors.grey[600]),
                    ),
                    const SizedBox(height: 16),
                    FilledButton.icon(
                      onPressed: () {
                        final quizId = lesson['quiz']?['id'] as String?;
                        if (quizId != null) {
                          context.push(
                            '/quiz-take/${lesson['moduleId']}/$quizId',
                          );
                        } else {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Quiz not found')),
                          );
                        }
                      },
                      icon: const Icon(Icons.play_arrow),
                      label: const Text('Start Quiz'),
                    ),
                  ],
                ),
              ),
            )
          else
            const Expanded(
              child: Center(child: Text('Unknown content type')),
            ),

          // Lesson Info & Navigation (hide in landscape)
          if (!_isLandscape && contentType != 'pdf')
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (description != null) ...[
                    Text(
                      description,
                      style: TextStyle(color: Colors.grey[700]),
                    ),
                    const SizedBox(height: 16),
                  ],
                  Text(
                    'Course Curriculum',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 8),
                  ...modules.map((mod) {
                    final modLessons =
                        (mod['lessons'] as List<dynamic>? ?? [])
                            .cast<Map<String, dynamic>>();
                    return Card(
                      margin: const EdgeInsets.only(bottom: 8),
                      child: ExpansionTile(
                        title: Text(mod['title'] as String? ?? 'Module'),
                        children: modLessons.map((l) {
                          final isCurrent = l['id'] == widget.lessonId;
                          final type = l['contentType'] as String? ?? 'text';
                          return ListTile(
                            dense: true,
                            leading: Icon(
                              isCurrent ? Icons.play_arrow : _iconForType(type),
                              size: 16,
                              color: isCurrent
                                  ? const Color(0xFF2563EB)
                                  : Colors.grey,
                            ),
                            title: Text(
                              l['title'] as String? ?? 'Lesson',
                              style: TextStyle(
                                fontWeight: isCurrent
                                    ? FontWeight.bold
                                    : FontWeight.normal,
                              ),
                            ),
                            trailing: l['isPreview'] == true
                                ? Text(
                                    'Free',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: Colors.green[700],
                                    ),
                                  )
                                : null,
                            onTap: isCurrent
                                ? null
                                : () {
                                    context.go('/lessons/${l['id']}');
                                  },
                          );
                        }).toList(),
                      ),
                    );
                  }),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildPdfViewer(BuildContext context, String contentUrl) {
    final resolved = _resolveUrl(contentUrl);
    // Native mobile uses flutter_pdfview; web/desktop uses fallback
    if (!kIsWeb) {
      try {
        // flutter_pdfview is only available on Android/iOS
        return _buildPdfFallback(context, resolved);
      } catch (_) {
        return _buildPdfFallback(context, resolved);
      }
    }
    return _buildPdfFallback(context, resolved);
  }

  Widget _buildPdfFallback(BuildContext context, String resolved) {
    return Container(
      color: Colors.grey[100],
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.picture_as_pdf, size: 64, color: Colors.red),
            const SizedBox(height: 12),
            Text(
              'PDF Document',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: SelectableText(
                resolved,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 12),
              ),
            ),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: () async {
                final uri = Uri.parse(resolved);
                if (await canLaunchUrl(uri)) {
                  await launchUrl(uri, mode: LaunchMode.externalApplication);
                }
              },
              icon: const Icon(Icons.open_in_new),
              label: const Text('Open PDF'),
            ),
          ],
        ),
      ),
    );
  }

  IconData _iconForType(String type) {
    switch (type) {
      case 'video':
        return Icons.play_circle_outline;
      case 'pdf':
        return Icons.picture_as_pdf;
      case 'quiz':
        return Icons.quiz;
      default:
        return Icons.article;
    }
  }
}
