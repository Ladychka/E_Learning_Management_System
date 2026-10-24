import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { authApi } from "@/lib/api";
import { Loader2, Save, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";

export const Profile = () => {
  const { user, setUser, logout } = useAuth();
  const [form, setForm] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    bio: (user?.profile as any)?.bio || "",
    phone: (user?.profile as any)?.phone || "",
    address: (user?.profile as any)?.address || "",
    education: (user?.profile as any)?.education || "",
    occupation: (user?.profile as any)?.occupation || "",
  });
  const [loading, setLoading] = useState(false);
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [deactivatePassword, setDeactivatePassword] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.updateProfile(form);
      setUser(res.data.data);
      toast.success("Profile updated");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async () => {
    try {
      await authApi.deactivate(deactivatePassword);
      toast.success("Account deactivated");
      logout();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to deactivate");
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">My Profile</h1>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">First name</label>
            <input
              name="firstName"
              value={form.firstName}
              onChange={handleChange}
              className="input mt-1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Last name</label>
            <input
              name="lastName"
              value={form.lastName}
              onChange={handleChange}
              className="input mt-1"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">Bio</label>
          <textarea
            name="bio"
            rows={3}
            value={form.bio}
            onChange={handleChange}
            className="input mt-1"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Phone</label>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className="input mt-1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Occupation</label>
            <input
              name="occupation"
              value={form.occupation}
              onChange={handleChange}
              className="input mt-1"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">Address</label>
          <input
            name="address"
            value={form.address}
            onChange={handleChange}
            className="input mt-1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Education</label>
          <input
            name="education"
            value={form.education}
            onChange={handleChange}
            className="input mt-1"
          />
        </div>

        <div className="flex items-center gap-2">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Changes
          </button>
        </div>
      </form>

      <div className="card border-red-200">
        <h3 className="text-lg font-semibold text-red-700">Danger Zone</h3>
        {!showDeactivate ? (
          <button
            onClick={() => setShowDeactivate(true)}
            className="btn-danger mt-3"
          >
            <AlertTriangle className="mr-2 h-4 w-4" />
            Deactivate Account
          </button>
        ) : (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-red-600">
              Enter your password to confirm account deactivation.
            </p>
            <input
              type="password"
              placeholder="Current password"
              value={deactivatePassword}
              onChange={(e) => setDeactivatePassword(e.target.value)}
              className="input"
            />
            <div className="flex gap-2">
              <button onClick={handleDeactivate} className="btn-danger">
                Confirm Deactivate
              </button>
              <button
                onClick={() => setShowDeactivate(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};