import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings as SettingsIcon, User, Shield, ArrowLeft, LogOut } from "lucide-react";
import { getAdminSidebarSections } from "@/lib/admin-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AppSidebar from "@/components/AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { updatePassword } from "@/lib/api";

const AdminSettings = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast.error("Please enter both passwords");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    
    setIsUpdating(true);
    try {
      await updatePassword({ currentPassword, newPassword });
      toast.success("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to update password");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const sidebarSections = getAdminSidebarSections();

  return (
    <div className="flex min-h-screen">
      <AppSidebar
        title="DietByRD"
        subtitle="Admin Panel"
        sections={sidebarSections}
      />

      <main className="flex-1 bg-background">
        <div className="px-6 py-4 border-b flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-xl font-semibold">Settings</h1>
        </div>

        <div className="p-6 max-w-2xl space-y-6">
          {/* Profile Section */}
          <div className="bg-card rounded-xl border p-6">
            <div className="flex items-center gap-3 mb-6">
              <User className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">Admin Profile</h2>
            </div>
            <div className="grid gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Full Name</label>
                <Input defaultValue={user?.name || ""} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone Number</label>
                <Input defaultValue={user?.phone || ""} disabled />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <Input defaultValue={user?.role || ""} disabled />
              </div>
            </div>
          </div>

          {/* Security Section */}
          <div className="bg-card rounded-xl border p-6">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">Security</h2>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Current Password</label>
                <Input type="password" placeholder="••••••••" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">New Password</label>
                <Input type="password" placeholder="••••••••" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              </div>
              <Button size="sm" onClick={handleUpdatePassword} disabled={isUpdating}>
                {isUpdating ? "Updating..." : "Update Password"}
              </Button>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-destructive/20 p-6">
            <Button variant="destructive" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminSettings;
