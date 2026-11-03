import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

jest.mock("../../api/quizzes", () => ({
  getQuizForLesson: jest.fn(),
  getQuizStatus: jest.fn(),
  startQuizAttempt: jest.fn(),
  submitQuizAttempt: jest.fn(),
  getQuizResults: jest.fn(),
}));

import { QuizTakeScreen } from "../QuizTakeScreen";
import { QuizResultScreen } from "../QuizResultScreen";
import {
  getQuizForLesson,
  getQuizResults,
  getQuizStatus,
  startQuizAttempt,
  submitQuizAttempt,
} from "../../api/quizzes";

const questions = [
  {
    id: "q1",
    type: "MCQ",
    question: "Which option grows with compound interest?",
    options: ["Simple interest", "Compound interest"],
    points: 1,
  },
  {
    id: "q2",
    type: "TRUE_FALSE",
    question: "A budget helps track spending.",
    options: ["True", "False"],
    points: 1,
  },
  {
    id: "q3",
    type: "SHORT_ANSWER",
    question: "Name one liquid asset.",
    points: 1,
  },
];

const quiz = {
  id: "quiz-1",
  lessonId: "lesson-1",
  title: "FinTech Foundations Quiz",
  description: "Check your understanding.",
  timeLimit: 10,
  maxAttempts: 3,
  passingScore: 70,
  isPublished: true,
  questions,
};

function makeNavigation() {
  return {
    navigate: jest.fn(),
    goBack: jest.fn(),
    replace: jest.fn(),
    popToTop: jest.fn(),
  } as any;
}

describe("quiz flows", () => {
  beforeEach(() => {
    (getQuizForLesson as jest.Mock).mockResolvedValue(quiz);
    (getQuizStatus as jest.Mock).mockResolvedValue({
      attempts: [],
      totalAttempts: 0,
      completedCount: 0,
      remainingAttempts: 2,
      maxAttempts: 3,
      timeLimit: 10,
    });
    (startQuizAttempt as jest.Mock).mockResolvedValue({
      attempt: {
        id: "attempt-1",
        status: "in_progress",
        score: 0,
        maxScore: 3,
        percentage: null,
        attemptNumber: 1,
        timeLimit: 10,
        startedAt: new Date().toISOString(),
      },
      questions,
    });
    (submitQuizAttempt as jest.Mock).mockResolvedValue({
      id: "attempt-1",
      status: "completed",
      score: 3,
      maxScore: 3,
      percentage: "100",
      attemptNumber: 1,
      submittedAt: new Date().toISOString(),
    });
  });

  it("answers MCQ, true/false, and short-answer questions and submits", async () => {
    const navigation = makeNavigation();
    await render(
      <QuizTakeScreen
        navigation={navigation}
        route={{
          key: "quiz-take",
          name: "QuizTake",
          params: { quizId: quiz.id, lessonId: quiz.lessonId },
        } as any}
      />
    );

    await waitFor(() =>
      expect(screen.getByTestId("quiz-start-attempt")).toBeTruthy()
    );
    await fireEvent.press(screen.getByTestId("quiz-start-attempt"));

    await waitFor(() =>
      expect(screen.getByTestId("quiz-question-q1")).toBeTruthy()
    );
    expect(screen.getByTestId("quiz-timer")).toHaveTextContent(/Time left/);

    await fireEvent.press(screen.getByTestId("quiz-option-q1-1"));
    await fireEvent.press(screen.getByTestId("quiz-option-q2-0"));
    await fireEvent.changeText(
      screen.getByTestId("quiz-answer-q3"),
      "Liquidity"
    );

    await fireEvent.press(screen.getByTestId("quiz-submit"));

    await waitFor(() =>
      expect(submitQuizAttempt).toHaveBeenCalledWith("attempt-1", [
        { questionId: "q1", answer: "Compound interest" },
        { questionId: "q2", answer: "True" },
        { questionId: "q3", answer: "Liquidity" },
      ])
    );
    expect(navigation.replace).toHaveBeenCalledWith("QuizResult", {
      attemptId: "attempt-1",
      title: quiz.title,
    });
  });

  it("shows the quiz result with correct, incorrect, and pending answers", async () => {
    const navigation = makeNavigation();
    (getQuizResults as jest.Mock).mockResolvedValue({
      id: "attempt-1",
      status: "completed",
      score: 2,
      maxScore: 3,
      percentage: "67",
      attemptNumber: 1,
      submittedAt: new Date().toISOString(),
      quiz: {
        id: quiz.id,
        title: quiz.title,
        passingScore: 60,
        timeLimit: 10,
        maxAttempts: 3,
      },
      answers: [
        {
          id: "answer-1",
          questionId: "q1",
          answer: "Compound interest",
          isCorrect: true,
          pointsEarned: 1,
          question: {
            id: "q1",
            type: "MCQ",
            question: questions[0].question,
            correctAnswer: "Compound interest",
            points: 1,
          },
        },
        {
          id: "answer-2",
          questionId: "q2",
          answer: "False",
          isCorrect: false,
          pointsEarned: 0,
          question: {
            id: "q2",
            type: "TRUE_FALSE",
            question: questions[1].question,
            correctAnswer: "True",
            points: 1,
          },
        },
        {
          id: "answer-3",
          questionId: "q3",
          answer: "Liquidity",
          isCorrect: null,
          pointsEarned: 0,
          question: {
            id: "q3",
            type: "SHORT_ANSWER",
            question: questions[2].question,
            correctAnswer: "Cash",
            points: 1,
          },
        },
      ],
    });

    await render(
      <QuizResultScreen
        navigation={navigation}
        route={{
          key: "quiz-result",
          name: "QuizResult",
          params: { attemptId: "attempt-1" },
        } as any}
      />
    );

    await waitFor(() =>
      expect(screen.getByTestId("quiz-result-percentage")).toHaveTextContent(
        "67%"
      )
    );
    expect(screen.getByTestId("quiz-result-status")).toHaveTextContent("Passed");
    expect(screen.getAllByText("Correct").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Incorrect").length).toBeGreaterThan(0);
    expect(screen.getByText("Pending manual grading")).toBeTruthy();
    expect(screen.getAllByText("Compound interest").length).toBeGreaterThan(0);
    expect(screen.getByText("Cash")).toBeTruthy();
  });
});
