import { useEffect, useState } from "react";
import { userApi } from "@/lib/api";
import {
  Search,
  Ban,
  CheckCircle,
  Trash2,
  Loader2,
  Shield,
  User,
  GraduationCap,
} from "lucide-react";
import toast from "react-hot-toast";

interface UserItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  isEmailVerified: boolean;
  lastLoginAt: string;
  createdAt: string;
  profile?: { phone: string };
}

export const AdminUsers = () => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(meta.page) };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.status = statusFilter;
      const res = await userApi.getUsers(params);
      setUsers(res.data.data);
      setMeta(res.data.meta);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta.page, roleFilter, statusFilter]);

  const handleSuspend = async (id: string) => {
    try {
      await userApi.suspendUser(id);
      toast.success("User suspended");
      fetchUsers();
    } catch {
      toast.error("Failed to suspend user");
    }
  };

  const handleReactivate = async (id: string) => {
    try {
      await userApi.reactivateUser(id);
      toast.success("User reactivated");
      fetchUsers();
    } catch {
      toast.error("Failed to reactivate user");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this user permanently?")) return;
    try {
      await userApi.deleteUser(id);
      toast.success("User deleted");
      fetchUsers();
    } catch {
      toast.error("Failed to delete user");
    }
  };

  const roleIcon = (role: string) => {
    if (role === "ADMIN") return <Shield className="h-4 w-4 text-red-500" />;
    if (role === "INSTRUCTOR")
      return <GraduationCap className="h-4 w-4 text-blue-500" />;
    return <User className="h-4 w-4 text-gray-500" />;
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      ACTIVE: "bg-green-100 text-green-700",
      INACTIVE: "bg-gray-100 text-gray-700",
      SUSPENDED: "bg-red-100 text-red-700",
      PENDING_VERIFICATION: "bg-yellow-100 text-yellow-700",
    };
    return (
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
          map[status] || "bg-gray-100"
        }`}
      >
        {status.replace("_", " ")}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">User Management</h1>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchUsers()}
            className="input pl-9"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="input"
        >
          <option value="">All Roles</option>
          <option value="STUDENT">Student</option>
          <option value="INSTRUCTOR">Instructor</option>
          <option value="ADMIN">Admin</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="PENDING_VERIFICATION">Pending Verification</option>
        </select>
        <button onClick={fetchUsers} className="btn-primary">
          Search
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {[
                "Name",
                "Email",
                "Role",
                "Status",
                "Verified",
                "Last Login",
                "Actions",
              ].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary-600" />
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-500">
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3">
                    {u.firstName} {u.lastName}
                  </td>
                  <td className="px-4 py-3 text-sm">{u.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {roleIcon(u.role)}
                      <span className="text-sm capitalize">{u.role.toLowerCase()}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">{statusBadge(u.status)}</td>
                  <td className="px-4 py-3">
                    {u.isEmailVerified ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <span className="text-xs text-gray-400">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {u.lastLoginAt
                      ? new Date(u.lastLoginAt).toLocaleDateString()
                      : "Never"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {u.status !== "SUSPENDED" ? (
                        <button
                          onClick={() => handleSuspend(u.id)}
                          className="rounded p-1 text-red-600 hover:bg-red-50"
                          title="Suspend"
                        >
                          <Ban className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReactivate(u.id)}
                          className="rounded p-1 text-green-600 hover:bg-green-50"
                          title="Reactivate"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(u.id)}
                        className="rounded p-1 text-gray-600 hover:bg-gray-100"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">
          Total: {meta.total} users
        </span>
        <div className="flex gap-2">
          <button
            disabled={meta.page <= 1}
            onClick={() => setMeta((m) => ({ ...m, page: m.page - 1 }))}
            className="btn-secondary"
          >
            Previous
          </button>
          <button
            disabled={meta.page >= meta.totalPages}
            onClick={() => setMeta((m) => ({ ...m, page: m.page + 1 }))}
            className="btn-secondary"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};