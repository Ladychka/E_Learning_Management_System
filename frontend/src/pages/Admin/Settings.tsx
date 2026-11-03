import React, { useEffect, useState } from "react";
import { settingApi, backupApi } from "../../lib/api";
import { Settings as SettingsIcon, Save, Database, Download, CheckCircle, AlertCircle, ShieldAlert, Loader2 } from "lucide-react";

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"branding" | "platform" | "backup">("branding");
  const [siteName, setSiteName] = useState("FinTech ELMS");
  const [siteLogo, setSiteLogo] = useState("/logo.svg");
  const [contactEmail, setContactEmail] = useState("support@fintechelms.com");
  const [defaultCurrency, setDefaultCurrency] = useState("USD");
  const [maintenanceMode, setMaintenanceMode] = useState("false");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Backup state
  const [backupStatus, setBackupStatus] = useState<any>(null);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupExporting, setBackupExporting] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchBackupStatus();
  }, []);

  const handleExportBackup = async () => {
    try {
      setBackupExporting(true);
      const res = await backupApi.exportBackup();
      const blob = new Blob([res.data], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `elms-backup-${Date.now()}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Backup export failed:", err);
    } finally {
      setBackupExporting(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await settingApi.getAllSettings();
      const list = res.data.data;
      list.forEach((s: any) => {
        if (s.key === "site_name") setSiteName(s.value);
        if (s.key === "site_logo") setSiteLogo(s.value);
        if (s.key === "contact_email") setContactEmail(s.value);
        if (s.key === "default_currency") setDefaultCurrency(s.value);
        if (s.key === "maintenance_mode") setMaintenanceMode(s.value);
      });
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    }
  };

  const fetchBackupStatus = async () => {
    try {
      setBackupLoading(true);
      const res = await backupApi.getBackupStatus();
      setBackupStatus(res.data.data);
    } catch (err) {
      console.error("Failed to check backup status:", err);
    } finally {
      setBackupLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setErrorMessage("");
      setSaveSuccess(false);

      await settingApi.updateSettings([
        { key: "site_name", value: siteName, group: "branding", isPublic: true },
        { key: "site_logo", value: siteLogo, group: "branding", isPublic: true },
        { key: "contact_email", value: contactEmail, group: "general", isPublic: true },
        { key: "default_currency", value: defaultCurrency, group: "payments", isPublic: true },
        { key: "maintenance_mode", value: maintenanceMode, group: "platform", isPublic: true },
      ]);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || "Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-blue-600" />
          System & Platform Settings
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure site branding, localized currency, maintenance mode, and database backups.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab("branding")}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === "branding"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Site Branding & General
        </button>
        <button
          onClick={() => setActiveTab("platform")}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === "platform"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Platform & Availability
        </button>
        <button
          onClick={() => setActiveTab("backup")}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === "backup"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Database Backups
        </button>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          Settings successfully saved.
        </div>
      )}
      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {errorMessage}
        </div>
      )}

      {/* Branding Tab */}
      {activeTab === "branding" && (
        <form onSubmit={handleSave} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900 border-b pb-2">Site Identity & Localization</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Site Title</label>
              <input
                type="text"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Logo URL / Icon Path</label>
              <input
                type="text"
                value={siteLogo}
                onChange={(e) => setSiteLogo(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Contact & Support Email</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Default Display Currency</label>
              <select
                value={defaultCurrency}
                onChange={(e) => setDefaultCurrency(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="USD">USD ($)</option>
                <option value="KHR">KHR (៛)</option>
              </select>
            </div>
          </div>
          <div className="pt-4 border-t flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save Branding"}
            </button>
          </div>
        </form>
      )}

      {/* Platform Tab */}
      {activeTab === "platform" && (
        <form onSubmit={handleSave} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900 border-b pb-2">Maintenance & System Availability</h2>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <div className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-orange-500" />
                Maintenance Mode
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                When active, non-admin users will see a maintenance notice and will not be able to checkout or take exams.
              </p>
            </div>
            <select
              value={maintenanceMode}
              onChange={(e) => setMaintenanceMode(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-medium"
            >
              <option value="false">Disabled (Normal Online)</option>
              <option value="true">Active (Maintenance)</option>
            </select>
          </div>

          <div className="pt-4 border-t flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save Platform State"}
            </button>
          </div>
        </form>
      )}

      {/* Backup Tab */}
      {activeTab === "backup" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-600" />
                Database Health & Snapshot Backups
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                US-094 & US-095: On-demand snapshot creation and automated schedule inspection.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportBackup}
              disabled={backupExporting}
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed transition-colors"
            >
              {backupExporting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              {backupExporting ? "Exporting..." : "Download JSON Backup"}
            </button>
          </div>

          {backupLoading ? (
            <div className="text-sm text-gray-500 py-6 text-center">Checking database metrics...</div>
          ) : backupStatus ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-xs text-gray-500 font-medium">Database Status</div>
                  <div className="text-lg font-bold text-green-600 capitalize">{backupStatus.databaseStatus}</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-xs text-gray-500 font-medium">Registered Users</div>
                  <div className="text-lg font-bold text-gray-900">{backupStatus.tables?.users || 0}</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-xs text-gray-500 font-medium">Courses Created</div>
                  <div className="text-lg font-bold text-gray-900">{backupStatus.tables?.courses || 0}</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-xs text-gray-500 font-medium">Active Enrollments</div>
                  <div className="text-lg font-bold text-gray-900">{backupStatus.tables?.enrollments || 0}</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-xs text-gray-500 font-medium">Processed Payments</div>
                  <div className="text-lg font-bold text-gray-900">{backupStatus.tables?.payments || 0}</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-xs text-gray-500 font-medium">Exam & Quiz Attempts</div>
                  <div className="text-lg font-bold text-gray-900">{backupStatus.tables?.quizAttempts || 0}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">Could not read database metrics.</div>
          )}
        </div>
      )}
    </div>
  );
};
export default Settings;
