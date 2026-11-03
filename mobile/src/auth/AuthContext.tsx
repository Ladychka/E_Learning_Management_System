import axios from "axios";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  AuthUser,
  getMeRequest,
  loginRequest,
  logoutRequest,
} from "../api/auth";
import { setSessionExpiredHandler } from "../api/client";
import { tokenStorage } from "../storage/tokenStorage";

type AuthStatus = "loading" | "signedOut" | "signedIn";

type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  authNotice: string | null;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  updateUser: (next: AuthUser) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  const signOutLocally = useCallback(async () => {
    await tokenStorage.clear();
    setUser(null);
    setAuthNotice(null);
    setStatus("signedOut");
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(() => {
      void tokenStorage.clear();
      setUser(null);
      setAuthNotice("Your session expired. Please sign in again.");
      setStatus("signedOut");
    });
    return () => setSessionExpiredHandler(null);
  }, []);

  useEffect(() => {
    let active = true;

    const restoreSession = async () => {
      const [accessToken, refreshToken] = await Promise.all([
        tokenStorage.getAccessToken(),
        tokenStorage.getRefreshToken(),
      ]);

      if (!accessToken && !refreshToken) {
        if (active) setStatus("signedOut");
        return;
      }

      try {
        const me = await getMeRequest();
        if (!active) return;
        setUser(me);
        setAuthNotice(null);
        setStatus(me.role === "STUDENT" ? "signedIn" : "signedOut");
        if (me.role !== "STUDENT") {
          await tokenStorage.clear();
        }
      } catch (error) {
        if (!active) return;
        const statusCode = axios.isAxiosError(error)
          ? error.response?.status
          : undefined;
        if (statusCode === 401 || statusCode === 403) {
          await signOutLocally();
        } else {
          // Keep valid tokens on transient network/server failures so the
          // student can retry instead of being forced to sign in again.
          setUser(null);
          setAuthNotice(
            "We could not restore your session. Check your connection and sign in again."
          );
          setStatus("signedOut");
        }
      }
    };

    restoreSession();
    return () => {
      active = false;
    };
  }, [signOutLocally]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await loginRequest(email.trim(), password);
    await tokenStorage.save(result.accessToken, result.refreshToken);

    if (result.user.role !== "STUDENT") {
      await tokenStorage.clear();
      throw new Error("This mobile app is for student accounts only.");
    }

    setUser(result.user);
    setAuthNotice(null);
    setStatus("signedIn");
    return result.user;
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = await tokenStorage.getRefreshToken();
    try {
      await logoutRequest(refreshToken);
    } catch {
      // Local logout must succeed even when the backend is unreachable.
    } finally {
      await signOutLocally();
    }
  }, [signOutLocally]);

  const updateUser = useCallback((next: AuthUser) => {
    setUser(next);
  }, []);

  const value = useMemo(
    () => ({ status, user, authNotice, login, logout, updateUser }),
    [status, user, authNotice, login, logout, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
