import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import * as DocumentPicker from "expo-document-picker";

jest.mock("../../api/assignments", () => ({
  getAssignment: jest.fn(),
  submitAssignment: jest.fn(),
  uploadSubmissionFile: jest.fn(),
}));

import { AssignmentSubmitScreen } from "../AssignmentSubmitScreen";
import {
  getAssignment,
  submitAssignment,
  uploadSubmissionFile,
} from "../../api/assignments";

const assignment = {
  id: "assignment-1",
  courseId: "course-1",
  title: "Budget Plan",
  description: "Create a household budget.",
  instructions: "Submit a short budget with at least three categories.",
  maxPoints: 100,
  dueDate: new Date(Date.now() + 86_400_000).toISOString(),
  allowLate: true,
  attachments: [],
  isPublished: true,
  course: { id: "course-1", title: "Personal Finance" },
  submission: null,
  submissions: [],
};

function makeNavigation() {
  return {
    navigate: jest.fn(),
    goBack: jest.fn(),
    replace: jest.fn(),
  } as any;
}

describe("assignment submission", () => {
  beforeEach(() => {
    (getAssignment as jest.Mock).mockResolvedValue(assignment);
    (submitAssignment as jest.Mock).mockResolvedValue({
      id: "submission-1",
      assignmentId: assignment.id,
      studentId: "student-1",
      content: "My budget",
      fileUrls: [],
      submittedAt: new Date().toISOString(),
      isLate: false,
    });
  });

  it("submits written content and a web link", async () => {
    const navigation = makeNavigation();
    await render(
      <AssignmentSubmitScreen
        navigation={navigation}
        route={{
          key: "submit",
          name: "AssignmentSubmit",
          params: { assignmentId: assignment.id },
        } as any}
      />
    );

    await waitFor(() =>
      expect(screen.getByTestId("assignment-submit-title")).toHaveTextContent(
        assignment.title
      )
    );

    await fireEvent.changeText(
      screen.getByTestId("assignment-submit-content"),
      "  My household budget  "
    );
    await fireEvent.changeText(
      screen.getByTestId("assignment-link-input"),
      "https://example.com/budget"
    );
    await fireEvent.press(screen.getByTestId("assignment-add-link"));
    await fireEvent.press(screen.getByTestId("assignment-submit"));

    await waitFor(() =>
      expect(submitAssignment).toHaveBeenCalledWith(assignment.id, {
        content: "My household budget",
        fileUrls: ["https://example.com/budget"],
      })
    );
    expect(navigation.goBack).toHaveBeenCalled();
  });

  it("uploads an attached file and includes it in the submission", async () => {
    const navigation = makeNavigation();
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: "file:///tmp/budget.pdf",
          name: "budget.pdf",
          mimeType: "application/pdf",
        },
      ],
    });
    (uploadSubmissionFile as jest.Mock).mockResolvedValue({
      url: "/uploads/submissions/budget.pdf",
      originalName: "budget.pdf",
      mimeType: "application/pdf",
    });

    await render(
      <AssignmentSubmitScreen
        navigation={navigation}
        route={{
          key: "submit",
          name: "AssignmentSubmit",
          params: { assignmentId: assignment.id },
        } as any}
      />
    );

    await waitFor(() =>
      expect(screen.getByTestId("assignment-submit-file")).toBeTruthy()
    );
    await fireEvent.press(screen.getByTestId("assignment-submit-file"));

    await waitFor(() => expect(screen.getByText("budget.pdf")).toBeTruthy());
    expect(uploadSubmissionFile).toHaveBeenCalledWith({
      uri: "file:///tmp/budget.pdf",
      name: "budget.pdf",
      mimeType: "application/pdf",
      file: undefined,
    });

    await fireEvent.press(screen.getByTestId("assignment-submit"));

    await waitFor(() =>
      expect(submitAssignment).toHaveBeenCalledWith(assignment.id, {
        content: undefined,
        fileUrls: ["/uploads/submissions/budget.pdf"],
      })
    );
  });
});
