import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Login } from "@/pages/Login";
import { Register } from "@/pages/Register";
import { Dashboard } from "@/pages/Dashboard";
import { Courses } from "@/pages/Courses";
import { CourseDetail } from "@/pages/CourseDetail";
import { Profile } from "@/pages/Profile";
import { AdminUsers } from "@/pages/Admin/Users";
import { AdminCourses } from "@/pages/Admin/Courses";
import { AdminCategories } from "@/pages/Admin/Categories";
import { CourseBuilder } from "@/pages/CourseBuilder";
import { CourseSettings } from "@/pages/CourseSettings";
import { QuizBuilder } from "@/pages/QuizBuilder";
import { QuizTaking } from "@/pages/QuizTaking";
import { LessonPlayer } from "@/pages/LessonPlayer";
import { MyEnrollments } from "@/pages/MyEnrollments";
import { MyGrades } from "@/pages/MyGrades";
import { Gradebook } from "@/pages/Admin/Gradebook";
import { Checkout } from "@/pages/Checkout";
import { PaymentHistory } from "@/pages/PaymentHistory";
import { PaymentDetail } from "@/pages/PaymentDetail";
import { AssignmentDetail } from "@/pages/AssignmentDetail";
import { MyCertificates } from "@/pages/MyCertificates";
import { CertificateView } from "@/pages/CertificateView";
import { AuditLogs } from "@/pages/Admin/AuditLogs";
import { Settings as AdminSettings } from "@/pages/Admin/Settings";
import { Reports } from "@/pages/Admin/Reports";
import { FinanceTools } from "@/pages/FinanceTools";
import { NotFound } from "@/pages/NotFound";

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route element={<Layout />}>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/courses"
            element={
              <ProtectedRoute>
                <Courses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/finance-tools"
            element={
              <ProtectedRoute>
                <FinanceTools />
              </ProtectedRoute>
            }
          />
          <Route
            path="/courses/:id"
            element={
              <ProtectedRoute>
                <CourseDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <AdminUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/courses"
            element={
              <ProtectedRoute allowedRoles={["ADMIN", "INSTRUCTOR"]}>
                <AdminCourses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/categories"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <AdminCategories />
              </ProtectedRoute>
            }
          />
          <Route
            path="/courses/:id/builder"
            element={
              <ProtectedRoute allowedRoles={["INSTRUCTOR", "ADMIN"]}>
                <CourseBuilder />
              </ProtectedRoute>
            }
          />
          <Route
            path="/courses/:id/settings"
            element={
              <ProtectedRoute allowedRoles={["INSTRUCTOR", "ADMIN"]}>
                <CourseSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lessons/:lessonId/quiz"
            element={
              <ProtectedRoute allowedRoles={["INSTRUCTOR", "ADMIN"]}>
                <QuizBuilder />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lessons/:lessonId/quiz/take"
            element={
              <ProtectedRoute>
                <QuizTaking />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lessons/:id"
            element={
              <ProtectedRoute>
                <LessonPlayer />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-enrollments"
            element={
              <ProtectedRoute>
                <MyEnrollments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-grades"
            element={
              <ProtectedRoute>
                <MyGrades />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/gradebook"
            element={
              <ProtectedRoute allowedRoles={["ADMIN", "INSTRUCTOR"]}>
                <Gradebook />
              </ProtectedRoute>
            }
          />
          <Route
            path="/checkout/:courseId"
            element={
              <ProtectedRoute>
                <Checkout />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payments"
            element={
              <ProtectedRoute>
                <PaymentHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payments/:id"
            element={
              <ProtectedRoute>
                <PaymentDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/assignments/:id"
            element={
              <ProtectedRoute>
                <AssignmentDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-certificates"
            element={
              <ProtectedRoute allowedRoles={["STUDENT"]}>
                <MyCertificates />
              </ProtectedRoute>
            }
          />
          <Route
            path="/certificates/:id"
            element={
              <ProtectedRoute>
                <CertificateView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <ProtectedRoute allowedRoles={["ADMIN", "INSTRUCTOR"]}>
                <Reports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/audit-logs"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <AuditLogs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <AdminSettings />
              </ProtectedRoute>
            }
          />
        </Route>
        <Route path="/verify/:certificateNumber" element={<CertificateView />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;