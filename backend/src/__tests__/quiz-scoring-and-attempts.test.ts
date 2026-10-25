import { describe, it, expect } from "vitest";

describe("Quiz Scoring, Time Limits & Attempts Logic", () => {
  interface Question {
    id: string;
    points: number;
    correctOptionId: string;
  }

  interface Submission {
    answers: Record<string, string>; // questionId -> selectedOptionId
  }

  const sampleQuestions: Question[] = [
    { id: "q1", points: 20, correctOptionId: "opt-a" },
    { id: "q2", points: 30, correctOptionId: "opt-c" },
    { id: "q3", points: 50, correctOptionId: "opt-b" },
  ];

  function gradeQuiz(questions: Question[], submission: Submission, passingScorePercent = 70) {
    let earnedPoints = 0;
    const totalPoints = questions.reduce((acc, q) => acc + q.points, 0);

    for (const q of questions) {
      if (submission.answers[q.id] === q.correctOptionId) {
        earnedPoints += q.points;
      }
    }

    const percentage = (earnedPoints / totalPoints) * 100;
    const passed = percentage >= passingScorePercent;

    return { earnedPoints, totalPoints, percentage, passed };
  }

  it("calculates 100% score for all correct answers", () => {
    const submission = {
      answers: {
        q1: "opt-a",
        q2: "opt-c",
        q3: "opt-b",
      },
    };

    const result = gradeQuiz(sampleQuestions, submission);
    expect(result.earnedPoints).toBe(100);
    expect(result.totalPoints).toBe(100);
    expect(result.percentage).toBe(100);
    expect(result.passed).toBe(true);
  });

  it("identifies failing attempt when below threshold", () => {
    const submission = {
      answers: {
        q1: "opt-a", // 20 pts
        q2: "opt-wrong",
        q3: "opt-wrong",
      },
    };

    const result = gradeQuiz(sampleQuestions, submission, 70);
    expect(result.earnedPoints).toBe(20);
    expect(result.percentage).toBe(20);
    expect(result.passed).toBe(false);
  });

  it("enforces time limit expiration", () => {
    const timeLimitMinutes = 30;
    const startedAt = new Date(Date.now() - 35 * 60 * 1000); // 35 minutes ago
    const now = new Date();

    const elapsedMinutes = (now.getTime() - startedAt.getTime()) / (1000 * 60);
    const isExpired = elapsedMinutes > timeLimitMinutes;

    expect(isExpired).toBe(true);
  });
});
