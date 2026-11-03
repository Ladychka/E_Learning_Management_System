import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  Users,
  LayoutDashboard,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  FolderTree,
  GraduationCap,
  ClipboardList,
  Award,
  Receipt,
  FileCheck,
  BarChart3,
  Shield,
  Sliders,
  Calculator,
  Sun,
  Moon,
  Wifi,
  Sparkles,
  Languages,
} from "lucide-react";
import { useState } from "react";
import { NotificationDropdown } from "./NotificationDropdown";
import { OnboardingModal } from "./OnboardingModal";
import acledaLogo from "@/assets/acleda-logo.png";

export const Layout = () => {
  const { user, logout } = useAuth();
  const { isDark, setTheme, language, setLanguage, dataSaver, setDataSaver } = useTheme();
  const { t } = useTranslation();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(true);

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: "/", label: t("nav.dashboard") || "Dashboard", icon: LayoutDashboard },
    { path: "/courses", label: t("nav.courses") || "Courses", icon: BookOpen },
    { path: "/finance-tools", label: t("nav.financeTools") || "Finance Tools", icon: Calculator },
    { path: "/my-enrollments", label: t("nav.myCourses") || "My Enrollments", icon: ClipboardList },
    { path: "/my-grades", label: t("nav.grades") || "My Grades", icon: Award },
    { path: "/my-certificates", label: t("nav.certificates") || "My Certificates", icon: FileCheck },
    { path: "/payments", label: t("nav.payments") || "Payments", icon: Receipt },
  ];

  const adminItems = [
    { path: "/admin/courses", label: "Courses", icon: GraduationCap },
    { path: "/admin/gradebook", label: "Gradebook", icon: Award },
    { path: "/admin/reports", label: "Analytics", icon: BarChart3 },
    { path: "/admin/users", label: "Users", icon: Users },
    { path: "/admin/categories", label: "Topics", icon: FolderTree },
    { path: "/admin/audit-logs", label: "Audit Logs", icon: Shield },
    { path: "/admin/settings", label: "Settings", icon: Sliders },
  ];

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <OnboardingModal />
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 shadow-xl lg:shadow-none transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200/80 dark:border-slate-800 px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={acledaLogo} alt="ACLEDA Bank" className="h-9 w-9 object-contain" />
            <span className="tracking-tight font-extrabold text-[#163865] dark:text-white">ELMS FinTech</span>
          </Link>
          <button
            className="lg:hidden text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="space-y-1 px-4 py-4 overflow-y-auto max-h-[calc(100vh-8rem)]">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                isActive(item.path)
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80"
              }`}
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon className={`h-4 w-4 ${isActive(item.path) ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"}`} />
              {item.label}
            </Link>
          ))}

          {(user?.role === "ADMIN" || user?.role === "INSTRUCTOR") && (
            <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setAdminOpen(!adminOpen)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Settings className="h-3.5 w-3.5" />
                {t("nav.admin") || "Administration"}
                <ChevronDown
                  className={`ml-auto h-3.5 w-3.5 transition-transform ${
                    adminOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {adminOpen && (
                <div className="mt-1 space-y-1">
                  {adminItems
                    .filter((item) =>
                      user?.role === "ADMIN"
                        ? true
                        : !["/admin/users", "/admin/categories", "/admin/audit-logs", "/admin/settings"].includes(item.path)
                    )
                    .map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium transition ${
                          isActive(item.path)
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold"
                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                        onClick={() => setSidebarOpen(false)}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    ))}
                </div>
              )}
            </div>
          )}
        </nav>

        {/* User bar at bottom of sidebar */}
        <div className="absolute bottom-0 w-full border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950 text-sm font-bold text-emerald-800 dark:text-emerald-300">
              {user?.firstName?.[0] || "U"}
              {user?.lastName?.[0] || ""}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-xs font-bold text-slate-900 dark:text-slate-100">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="truncate text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                {user?.role?.toLowerCase()}
              </p>
            </div>
            <button
              onClick={logout}
              className="rounded-lg p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 lg:px-8 transition-colors">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden text-slate-500 hover:text-slate-700 dark:text-slate-400"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200/60 dark:border-emerald-800/40">
              <Sparkles className="h-3.5 w-3.5" />
              <span>National Bank of Cambodia Framework</span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* Low-Bandwidth Data Saver Toggle (C4) */}
            <button
              onClick={() => setDataSaver(!dataSaver)}
              className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition ${
                dataSaver
                  ? "bg-emerald-100 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300"
                  : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100"
              }`}
              title="Data Saver mode reduces media bitrate for low-speed connections"
            >
              <Wifi className="h-3.5 w-3.5" />
              <span>{dataSaver ? "Data Saver: ON" : "Data Saver"}</span>
            </button>

            {/* Language Selector: EN / KM (C3) */}
            <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-0.5">
              <button
                onClick={() => setLanguage("en")}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  language === "en"
                    ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
                title="Switch to English"
              >
                <Languages className="h-3.5 w-3.5" /> EN
              </button>
              <button
                onClick={() => setLanguage("km")}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  language === "km"
                    ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
                title="ប្តូរទៅភាសាខ្មែរ"
              >
                <Languages className="h-3.5 w-3.5" /> ខ្មែរ
              </button>
            </div>

            {/* Dark Mode Toggle (C1) */}
            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-600" />}
            </button>

            {/* In-app Notifications Dropdown */}
            <NotificationDropdown />

            {/* Profile Avatar / Link */}
            <Link
              to="/profile"
              className="text-xs font-bold text-slate-700 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-400 transition flex items-center gap-2"
            >
              <div className="h-7 w-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                {user?.firstName?.[0] || "U"}
              </div>
              <span className="hidden sm:inline">{user?.firstName || "Profile"}</span>
            </Link>
          </div>
        </header>

        {/* Main Content Body */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 bg-slate-50 dark:bg-slate-950 transition-colors">
          <Outlet />
        </main>
      </div>
    </div>
  );
};