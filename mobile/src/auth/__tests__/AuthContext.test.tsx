import React from "react";
import { Pressable, Text, View } from "react-native";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

jest.mock("../../api/auth", () => ({
  getMeRequest: jest.fn(),
  loginRequest: jest.fn(),
  logoutRequest: jest.fn(),
}));

jest.mock("../../api/client", () => ({
  setSessionExpiredHandler: jest.fn(),
}));

jest.mock("../../storage/tokenStorage", () => ({
  tokenStorage: {
    save: jest.fn(),
    getAccessToken: jest.fn(),
    getRefreshToken: jest.fn(),
    clear: jest.fn(),
  },
}));

import { AuthProvider, useAuth } from "../AuthContext";
import {
  getMeRequest,
  loginRequest,
  logoutRequest,
} from "../../api/auth";
import { tokenStorage } from "../../storage/tokenStorage";

const student = {
  id: "student-1",
  email: "student@elms.edu",
  firstName: "Sokha",
  lastName: "Student",
  role: "STUDENT" as const,
  status: "ACTIVE",
};

function Probe() {
  const { status, user, authNotice, login, logout } = useAuth();
  return (
    <View>
      <Text testID="status">{status}</Text>
      <Text testID="user">{user ? user.email : "none"}</Text>
      <Text testID="notice">{authNotice ?? "none"}</Text>
      <Pressable
        testID="login"
        onPress={() => {
          login("student@elms.edu", "Student123!").catch(() => {});
        }}
      >
        <Text>Login</Text>
      </Pressable>
      <Pressable
        testID="logout"
        onPress={() => {
          void logout();
        }}
      >
        <Text>Logout</Text>
      </Pressable>
    </View>
  );
}

function renderAuth() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>
  );
}

describe("AuthContext", () => {
  beforeEach(() => {
    (tokenStorage.getAccessToken as jest.Mock).mockResolvedValue(null);
    (tokenStorage.getRefreshToken as jest.Mock).mockResolvedValue(null);
  });

  it("starts signed out when no tokens are stored", async () => {
    await renderAuth();

    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("signedOut")
    );
    expect(screen.getByTestId("user")).toHaveTextContent("none");
  });

  it("restores a student session on startup", async () => {
    (tokenStorage.getAccessToken as jest.Mock).mockResolvedValue("access");
    (tokenStorage.getRefreshToken as jest.Mock).mockResolvedValue("refresh");
    (getMeRequest as jest.Mock).mockResolvedValue(student);

    await renderAuth();

    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("signedIn")
    );
    expect(screen.getByTestId("user")).toHaveTextContent(student.email);
  });

  it("keeps tokens and shows a notice on a transient restore failure", async () => {
    (tokenStorage.getAccessToken as jest.Mock).mockResolvedValue("access");
    (tokenStorage.getRefreshToken as jest.Mock).mockResolvedValue("refresh");
    (getMeRequest as jest.Mock).mockRejectedValue(new Error("network down"));

    await renderAuth();

    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("signedOut")
    );
    expect(screen.getByTestId("notice")).not.toHaveTextContent("none");
    expect(tokenStorage.clear).not.toHaveBeenCalled();
  });

  it("clears tokens when session restore is rejected by the backend", async () => {
    (tokenStorage.getAccessToken as jest.Mock).mockResolvedValue("access");
    (tokenStorage.getRefreshToken as jest.Mock).mockResolvedValue("refresh");
    (getMeRequest as jest.Mock).mockRejectedValue({
      isAxiosError: true,
      response: { status: 401 },
    });

    await renderAuth();

    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("signedOut")
    );
    expect(tokenStorage.clear).toHaveBeenCalled();
  });

  it("logs in, stores tokens, and logs out locally", async () => {
    (loginRequest as jest.Mock).mockResolvedValue({
      accessToken: "access",
      refreshToken: "refresh",
      expiresIn: "7d",
      user: student,
    });
    (logoutRequest as jest.Mock).mockResolvedValue(undefined);

    await renderAuth();
    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("signedOut")
    );

    await fireEvent.press(screen.getByTestId("login"));

    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("signedIn")
    );
    expect(tokenStorage.save).toHaveBeenCalledWith("access", "refresh");
    expect(screen.getByTestId("user")).toHaveTextContent(student.email);

    (tokenStorage.getRefreshToken as jest.Mock).mockResolvedValue("refresh");
    await fireEvent.press(screen.getByTestId("logout"));

    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("signedOut")
    );
    expect(logoutRequest).toHaveBeenCalledWith("refresh");
    expect(tokenStorage.clear).toHaveBeenCalled();
  });

  it("rejects non-student accounts without storing a session", async () => {
    (loginRequest as jest.Mock).mockResolvedValue({
      accessToken: "access",
      refreshToken: "refresh",
      expiresIn: "7d",
      user: { ...student, role: "INSTRUCTOR" },
    });

    await renderAuth();
    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("signedOut")
    );

    await fireEvent.press(screen.getByTestId("login"));

    await waitFor(() =>
      expect(tokenStorage.clear).toHaveBeenCalled()
    );
    expect(screen.getByTestId("status")).toHaveTextContent("signedOut");
  });
});
