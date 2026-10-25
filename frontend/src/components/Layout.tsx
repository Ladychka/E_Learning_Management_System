import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
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
} from "lucide-react";
import { useState } from "react";
import { NotificationDropdown } from "./NotificationDropdown";

export const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(true);

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard },
    { path: "/courses", label: "Courses", icon: BookOpen },
    { path: "/my-enrollments", label: "My Enrollments", icon: ClipboardList },
    { path: "/my-grades", label: "My Grades", icon: Award },
    { path: "/my-certificates", label: "My Certificates", icon: FileCheck },
    { path: "/payments", label: "Payments", icon: Receipt },
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
    <div className="flex h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-white shadow-lg transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b px-6">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold text-primary-700">
            <BookOpen className="h-6 w-6" />
            ELMS
          </Link>
          <button
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="space-y-1 px-4 py-4">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${
                isActive(item.path)
                  ? "bg-primary-50 text-primary-700"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}

          {(user?.role === "ADMIN" || user?.role === "INSTRUCTOR") && (
            <>
              <button
                onClick={() => setAdminOpen(!adminOpen)}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                <Settings className="h-5 w-5" />
                Administration
                <ChevronDown
                  className={`ml-auto h-4 w-4 transition-transform ${
                    adminOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {adminOpen && (
                <div className="ml-4 space-y-1">
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
                        className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${
                          isActive(item.path)
                            ? "bg-primary-50 text-primary-700"
                            : "text-gray-600 hover:bg-gray-100"
                        }`}
                        onClick={() => setSidebarOpen(false)}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    ))}
                </div>
              )}
            </>
          )}
        </nav>

        <div className="absolute bottom-0 w-full border-t bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="truncate text-xs text-gray-500 capitalize">
                {user?.role?.toLowerCase()}
              </p>
            </div>
            <button
              onClick={logout}
              className="rounded-md p-2 text-gray-500 hover:bg-gray-100"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center gap-4 border-b bg-white px-4 lg:px-8">
          <button
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="ml-auto flex items-center gap-3">
            <NotificationDropdown />
            <Link
              to="/profile"
              className="text-sm font-medium text-gray-700 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400"
            >
              My Profile
            </Link>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};