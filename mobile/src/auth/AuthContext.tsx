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
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  updateUser: (next: AuthUser) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);

  const signOutLocally = useCallback(async () => {
    await tokenStorage.clear();
    setUser(null);
    setStatus("signedOut");
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(() => {
      setUser(null);
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
        setStatus(me.role === "STUDENT" ? "signedIn" : "signedOut");
        if (me.role !== "STUDENT") {
          await tokenStorage.clear();
        }
      } catch {
        if (!active) return;
        await signOutLocally();
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
    () => ({ status, user, login, logout, updateUser }),
    [status, user, login, logout, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
