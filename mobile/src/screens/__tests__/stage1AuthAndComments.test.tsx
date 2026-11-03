import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

jest.mock("../../api/comments", () => ({
  getLessonComments: jest.fn(),
  createLessonComment: jest.fn(),
  deleteLessonComment: jest.fn(),
}));

jest.mock("../../api/auth", () => ({
  forgotPasswordRequest: jest.fn(),
  resetPasswordRequest: jest.fn(),
  registerRequest: jest.fn(),
}));

jest.mock("../../auth/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "student-1",
      firstName: "Sokha",
      lastName: "Student",
      email: "student@elms.edu",
      role: "STUDENT",
    },
  }),
}));

import { LessonComments } from "../../components/LessonComments";
import { ForgotPasswordScreen } from "../ForgotPasswordScreen";
import { RegisterScreen } from "../RegisterScreen";
import {
  createLessonComment,
  getLessonComments,
} from "../../api/comments";
import {
  forgotPasswordRequest,
  registerRequest,
} from "../../api/auth";

function makeNavigation() {
  return {
    navigate: jest.fn(),
    goBack: jest.fn(),
  } as any;
}

describe("stage 1 account and discussion flows", () => {
  beforeEach(() => {
    (getLessonComments as jest.Mock).mockResolvedValue([
      {
        id: "comment-1",
        lessonId: "lesson-1",
        userId: "student-2",
        content: "This explanation helped.",
        createdAt: new Date().toISOString(),
        user: {
          id: "student-2",
          firstName: "Anna",
          lastName: "Learner",
          role: "STUDENT",
        },
        replies: [],
      },
    ]);
    (createLessonComment as jest.Mock).mockResolvedValue({
      id: "comment-2",
      lessonId: "lesson-1",
      userId: "student-1",
      content: "Thanks for sharing.",
      createdAt: new Date().toISOString(),
      user: {
        id: "student-1",
        firstName: "Sokha",
        lastName: "Student",
        role: "STUDENT",
      },
    });
    (forgotPasswordRequest as jest.Mock).mockResolvedValue({
      success: true,
      message: "If an account exists, a reset email has been sent.",
    });
    (registerRequest as jest.Mock).mockResolvedValue({
      success: true,
      message: "Registration successful.",
      data: {},
    });
  });

  it("loads lesson comments and posts a new comment", async () => {
    await render(<LessonComments lessonId="lesson-1" />);

    await waitFor(() =>
      expect(screen.getByTestId("lesson-comment-comment-1")).toBeTruthy()
    );
    await fireEvent.changeText(
      screen.getByTestId("lesson-comment-input"),
      "Thanks for sharing."
    );
    await fireEvent.press(screen.getByTestId("lesson-comment-submit"));

    await waitFor(() =>
      expect(createLessonComment).toHaveBeenCalledWith(
        "lesson-1",
        "Thanks for sharing."
      )
    );
  });

  it("requests a password reset email", async () => {
    const navigation = makeNavigation();
    await render(
      <ForgotPasswordScreen
        navigation={navigation}
        route={{ key: "forgot", name: "ForgotPassword" } as any}
      />
    );

    await fireEvent.changeText(
      screen.getByTestId("forgot-password-email"),
      "student.dara@elms.edu"
    );
    await fireEvent.press(screen.getByTestId("forgot-password-submit"));

    await waitFor(() =>
      expect(forgotPasswordRequest).toHaveBeenCalledWith(
        "student.dara@elms.edu"
      )
    );
    expect(screen.getByTestId("forgot-password-sent")).toBeTruthy();
  });

  it("registers a student account", async () => {
    const navigation = makeNavigation();
    await render(
      <RegisterScreen
        navigation={navigation}
        route={{ key: "register", name: "Register" } as any}
      />
    );

    await fireEvent.changeText(
      screen.getByTestId("register-first-name"),
      "Dara"
    );
    await fireEvent.changeText(screen.getByTestId("register-last-name"), "Sok");
    await fireEvent.changeText(
      screen.getByTestId("register-email"),
      "dara.new@elms.edu"
    );
    await fireEvent.changeText(
      screen.getByTestId("register-password"),
      "NewPass123!"
    );
    await fireEvent.changeText(
      screen.getByTestId("register-confirm"),
      "NewPass123!"
    );
    await fireEvent.press(screen.getByTestId("register-submit"));

    await waitFor(() =>
      expect(registerRequest).toHaveBeenCalledWith({
        email: "dara.new@elms.edu",
        password: "NewPass123!",
        firstName: "Dara",
        lastName: "Sok",
      })
    );
    expect(screen.getByTestId("register-success")).toBeTruthy();
  });
});
