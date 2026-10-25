import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "@/lib/api";
import { BookOpen, Loader2, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";

export const Register = () => {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "STUDENT" as "STUDENT" | "INSTRUCTOR",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Password strength calculation
  const strength = useMemo(() => {
    const p = form.password;
    if (!p) return { score: 0, label: "None", color: "bg-slate-200" };
    let score = 0;
    if (p.length >= 8) score += 25;
    if (/[A-Z]/.test(p)) score += 25;
    if (/[0-9]/.test(p)) score += 25;
    if (/[^A-Za-z0-9]/.test(p)) score += 25;

    if (score <= 25) return { score, label: "Weak", color: "bg-rose-500" };
    if (score <= 50) return { score, label: "Fair", color: "bg-amber-500" };
    if (score <= 75) return { score, label: "Good", color: "bg-blue-500" };
    return { score: 100, label: "Strong", color: "bg-emerald-500" };
  }, [form.password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (strength.score < 50) {
      toast.error("Please choose a stronger password (at least 8 chars with numbers/uppercase)");
      return;
    }
    setLoading(true);
    try {
      await authApi.register(form);
      toast.success("Account created! Please check your email to verify.");
      navigate("/login");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 px-4 transition-colors">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-500/20">
            <BookOpen className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-2xl font-extrabold tracking-tight">Create your account</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Join Cambodian financial practitioners and learners on ELMS
          </p>
        </div>

        <div className="card shadow-lg border border-slate-200/80 dark:border-slate-800">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">First name</label>
                <input
                  name="firstName"
                  required
                  value={form.firstName}
                  onChange={handleChange}
                  className="input mt-1"
                  placeholder="Sophea"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Last name</label>
                <input
                  name="lastName"
                  required
                  value={form.lastName}
                  onChange={handleChange}
                  className="input mt-1"
                  placeholder="Rith"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Email address</label>
              <input
                name="email"
                type="email"
                required
                value={form.email}
                onChange={handleChange}
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
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={form.password}
                  onChange={handleChange}
                  className="input pr-10"
                  placeholder="Min 8 chars, uppercase, number"
                />
              </div>

              {/* Password strength meter */}
              {form.password && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold">
                    <span className="text-slate-400">Strength:</span>
                    <span className={strength.score >= 75 ? "text-emerald-600" : strength.score >= 50 ? "text-amber-600" : "text-rose-600"}>
                      {strength.label}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${strength.color}`}
                      style={{ width: `${strength.score}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Account Type</label>
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className="input mt-1"
              >
                <option value="STUDENT">Student / Financial Learner</option>
                <option value="INSTRUCTOR">Instructor / Lecturer</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 rounded-xl font-bold shadow-md"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Create Account"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-500 dark:text-slate-400">
          Already have an account?{" "}
          <Link to="/login" className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};