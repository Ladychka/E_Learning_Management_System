import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { authApi } from "@/lib/api";
import { Loader2, Eye, EyeOff, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import acledaLogo from "@/assets/acleda-logo.png";

export const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.login({ email, password });
      const { accessToken, refreshToken, user } = res.data.data;
      login(accessToken, refreshToken, user);
      toast.success("Welcome back!");
      navigate("/");
    } catch (err: any) {
      console.error("Login error:", err);
      toast.error(err.response?.data?.message || err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    toast.success("Demo credentials loaded!");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 px-4 transition-colors">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <img src={acledaLogo} alt="ACLEDA Bank" className="mx-auto h-16 w-16 object-contain" />
          <h2 className="mt-4 text-2xl font-extrabold tracking-tight">Sign in to ELMS FinTech</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Access your courses, financial calculators, and verified credentials
          </p>
        </div>

        <div className="card shadow-lg border border-slate-200/80 dark:border-slate-800">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input mt-1"
                placeholder="you@aub.edu.kh"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Password</label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs text-slate-400 hover:text-emerald-600 flex items-center gap-1"
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  <span>{showPassword ? "Hide" : "Show"}</span>
                </button>
              </div>
              <div className="relative mt-1">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pr-10"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 rounded-xl font-bold shadow-md"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Quick Demo Accounts Pill Bar */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
              <span>One-Click Demo Accounts</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillDemo("student@aub.edu.kh", "Student@123")}
                className="px-2 py-1.5 text-xs font-bold rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition border border-emerald-200/50"
              >
                Student
              </button>
              <button
                type="button"
                onClick={() => fillDemo("instructor@aub.edu.kh", "Instructor@123")}
                className="px-2 py-1.5 text-xs font-bold rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition border border-blue-200/50"
              >
                Instructor
              </button>
              <button
                type="button"
                onClick={() => fillDemo("admin@aub.edu.kh", "Admin@123")}
                className="px-2 py-1.5 text-xs font-bold rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 transition border border-purple-200/50"
              >
                Admin
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 dark:text-slate-400">
          Don't have an account?{" "}
          <Link to="/register" className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
};