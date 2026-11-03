import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

const mockUpdateUser = jest.fn();
const mockLogout = jest.fn();

jest.mock("../../auth/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "student-1",
      email: "student.dara@elms.edu",
      firstName: "Dara",
      lastName: "Sok",
      role: "STUDENT",
      status: "ACTIVE",
      profile: {
        bio: "Finance student",
        phone: "+855 96 555 664",
        address: "Phnom Penh",
        education: "RUPP",
        occupation: "Analyst",
      },
    },
    updateUser: mockUpdateUser,
    logout: mockLogout,
  }),
}));

jest.mock("../../api/auth", () => ({
  updateProfileRequest: jest.fn(),
  changePasswordRequest: jest.fn(),
}));

import { EditProfileScreen } from "../EditProfileScreen";
import { ChangePasswordScreen } from "../ChangePasswordScreen";
import { changePasswordRequest, updateProfileRequest } from "../../api/auth";

const updatedUser = {
  id: "student-1",
  email: "student.dara@elms.edu",
  firstName: "Dara",
  lastName: "Sok",
  role: "STUDENT",
  status: "ACTIVE",
  profile: {
    bio: "Finance student",
    phone: "+855 12 345 678",
    address: "Phnom Penh",
    education: "RUPP",
    occupation: "Analyst",
  },
};

function makeNavigation() {
  return {
    navigate: jest.fn(),
    goBack: jest.fn(),
    replace: jest.fn(),
  } as any;
}

describe("profile flows", () => {
  beforeEach(() => {
    (updateProfileRequest as jest.Mock).mockResolvedValue(updatedUser);
    (changePasswordRequest as jest.Mock).mockResolvedValue({
      success: true,
      message: "Password changed successfully. Please login again.",
    });
  });

  it("edits the profile and updates the auth user", async () => {
    const navigation = makeNavigation();
    await render(
      <EditProfileScreen
        navigation={navigation}
        route={{ key: "edit", name: "EditProfile" } as any}
      />
    );

    await fireEvent.changeText(
      screen.getByTestId("edit-profile-phone"),
      "+855 12 345 678"
    );
    await fireEvent.press(screen.getByTestId("edit-profile-save"));

    await waitFor(() =>
      expect(updateProfileRequest).toHaveBeenCalledWith({
        firstName: "Dara",
        lastName: "Sok",
        bio: "Finance student",
        phone: "+855 12 345 678",
        address: "Phnom Penh",
        education: "RUPP",
        occupation: "Analyst",
      })
    );
    expect(mockUpdateUser).toHaveBeenCalledWith(updatedUser);
    expect(navigation.goBack).toHaveBeenCalled();
  });

  it("changes the password, shows success, and signs out", async () => {
    const navigation = makeNavigation();
    await render(
      <ChangePasswordScreen
        navigation={navigation}
        route={{ key: "password", name: "ChangePassword" } as any}
      />
    );

    await fireEvent.changeText(
      screen.getByTestId("change-password-current"),
      "Student123!"
    );
    await fireEvent.changeText(
      screen.getByTestId("change-password-new"),
      "NewPass123!"
    );
    await fireEvent.changeText(
      screen.getByTestId("change-password-confirm"),
      "NewPass123!"
    );
    await fireEvent.press(screen.getByTestId("change-password-submit"));

    await waitFor(() =>
      expect(changePasswordRequest).toHaveBeenCalledWith(
        "Student123!",
        "NewPass123!"
      )
    );
    await waitFor(() =>
      expect(screen.getByTestId("change-password-success")).toBeTruthy()
    );
    await waitFor(() => expect(mockLogout).toHaveBeenCalled(), {
      timeout: 2500,
    });
  });
});
