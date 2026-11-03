import React, { useEffect, useState } from "react";
import { reportApi } from "../../lib/api";
import { BarChart3, Users, Award, Download, DollarSign, CheckCircle2, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"completion" | "revenue" | "students">("completion");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);

  // Data states
  const [completionStats, setCompletionStats] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any>(null);
  const [studentProgress, setStudentProgress] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === "completion") {
        const res = await reportApi.getCompletionStats();
        setCompletionStats(res.data.data);
      } else if (activeTab === "revenue") {
        const res = await reportApi.getRevenueAnalytics();
        setRevenueData(res.data.data);
      } else if (activeTab === "students") {
        const res = await reportApi.getStudentProgress();
        setStudentProgress(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch report data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (type: "completion" | "revenue" | "students") => {
    try {
      setExporting(type);
      const res = await reportApi.exportReportCsv(type);
      const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const dateStr = new Date().toISOString().split("T")[0];
      const filename =
        type === "completion"
          ? `course_completion_report_${dateStr}.csv`
          : type === "revenue"
          ? `revenue_report_${dateStr}.csv`
          : `student_progress_report_${dateStr}.csv`;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(
        type === "completion"
          ? "Course completion CSV downloaded"
          : type === "revenue"
          ? "Revenue CSV downloaded"
          : "Student progress CSV downloaded"
      );
    } catch (err: any) {
      console.error("Export failed:", err);
      toast.error(err.response?.data?.message || `Failed to export ${type} CSV`);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            Analytics & Reports
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            US-081 – US-090: Course completion rates, assessment health, student progress, and KHQR/Bakong revenue.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleExport("completion")}
            disabled={exporting !== null}
            className="inline-flex items-center px-3.5 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 shadow-sm disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed transition-colors"
          >
            {exporting === "completion" ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin text-gray-500" />
            ) : (
              <Download className="w-3.5 h-3.5 mr-1.5" />
            )}
            {exporting === "completion" ? "Exporting..." : "Export Completion CSV"}
          </button>
          <button
            type="button"
            onClick={() => handleExport("revenue")}
            disabled={exporting !== null}
            className="inline-flex items-center px-3.5 py-2 bg-blue-600 rounded-lg text-xs font-semibold text-white hover:bg-blue-700 shadow-sm disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed transition-colors"
          >
            {exporting === "revenue" ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin text-white" />
            ) : (
              <Download className="w-3.5 h-3.5 mr-1.5" />
            )}
            {exporting === "revenue" ? "Exporting..." : "Export Revenue CSV"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab("completion")}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "completion"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Award className="w-4 h-4" />
          Course Completion (US-081)
        </button>
        <button
          onClick={() => setActiveTab("revenue")}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "revenue"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Revenue & Payment Gateways (US-087)
        </button>
        <button
          onClick={() => setActiveTab("students")}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "students"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Users className="w-4 h-4" />
          Student Progress (US-082)
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-500 bg-white rounded-xl border">
          Generating analytics report...
        </div>
      ) : (
        <>
          {/* Completion Tab */}
          {activeTab === "completion" && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <h3 className="font-semibold text-gray-900 text-sm">Course Completion Funnel & Velocity</h3>
                <span className="text-xs text-gray-500">{completionStats.length} Courses Analyzed</span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left font-medium text-gray-600">Course</th>
                      <th className="px-6 py-3 text-center font-medium text-gray-600">Total Enrolled</th>
                      <th className="px-6 py-3 text-center font-medium text-gray-600">Active</th>
                      <th className="px-6 py-3 text-center font-medium text-gray-600">Completed</th>
                      <th className="px-6 py-3 text-center font-medium text-gray-600">Avg. Progress</th>
                      <th className="px-6 py-3 text-right font-medium text-gray-600">Completion Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {completionStats.map((c) => (
                      <tr key={c.courseId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">{c.title}</td>
                        <td className="px-6 py-4 text-center text-gray-700 font-semibold">{c.totalEnrollments}</td>
                        <td className="px-6 py-4 text-center text-blue-600 font-medium">{c.activeCount}</td>
                        <td className="px-6 py-4 text-center text-green-600 font-medium">{c.completedCount}</td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2 overflow-hidden">
                              <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${c.avgProgress}%` }} />
                            </div>
                            <span className="text-xs font-mono">{c.avgProgress}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              c.completionRate >= 70
                                ? "bg-green-100 text-green-800"
                                : c.completionRate >= 40
                                ? "bg-blue-100 text-blue-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {c.completionRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Revenue Tab */}
          {activeTab === "revenue" && revenueData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Revenue (USD)</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">
                    ${revenueData.totalRevenueUSD?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{revenueData.totalTransactions} Total Paid Orders</div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Revenue (KHR)</div>
                  <div className="text-2xl font-bold text-blue-600 mt-1">
                    ៛{revenueData.totalRevenueKHR?.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Bakong & Local KHQR Transfers</div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Top Cambodian Gateway</div>
                  <div className="text-2xl font-bold text-indigo-600 mt-1">
                    KHQR & Bakong
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Low fee local processing</div>
                </div>
              </div>

              {/* Gateway Breakdown */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 text-base mb-4">Payment Channel Distribution</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {Object.entries(revenueData.gatewayBreakdown || {}).map(([gw, stats]: [string, any]) => (
                    <div key={gw} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="font-bold text-gray-900 uppercase text-sm tracking-wide">{gw.replace("_", " ")}</div>
                      <div className="mt-2 text-xs text-gray-600">Volume: <span className="font-semibold text-gray-900">{stats.count} transactions</span></div>
                      <div className="text-xs text-gray-600">USD Total: <span className="font-semibold text-gray-900">${stats.totalUSD}</span></div>
                      <div className="text-xs text-gray-600">KHR Total: <span className="font-semibold text-gray-900">៛{stats.totalKHR}</span></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Student Progress Tab */}
          {activeTab === "students" && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <h3 className="font-semibold text-gray-900 text-sm">Learner Progress & Completion Register</h3>
                <button
                  type="button"
                  onClick={() => handleExport("students")}
                  disabled={exporting !== null}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 shadow-sm disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed transition-colors"
                >
                  {exporting === "students" ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin text-gray-500" />
                  ) : (
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  {exporting === "students" ? "Exporting..." : "Export Students CSV"}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left font-medium text-gray-600">Student</th>
                      <th className="px-6 py-3 text-left font-medium text-gray-600">Course</th>
                      <th className="px-6 py-3 text-center font-medium text-gray-600">Status</th>
                      <th className="px-6 py-3 text-center font-medium text-gray-600">Progress</th>
                      <th className="px-6 py-3 text-right font-medium text-gray-600">Certificate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {studentProgress.map((item) => (
                      <tr key={item.enrollmentId} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{item.student.name}</div>
                          <div className="text-xs text-gray-500">{item.student.email}</div>
                        </td>
                        <td className="px-6 py-4 text-gray-800">{item.course.title}</td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                              item.status === "completed"
                                ? "bg-green-100 text-green-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center font-semibold font-mono text-gray-900">
                          {item.progressPercent}%
                        </td>
                        <td className="px-6 py-4 text-right">
                          {item.certificate ? (
                            <span className="inline-flex items-center text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-green-600" />
                              {item.certificate.certificateNumber}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">In Progress</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
export default Reports;
