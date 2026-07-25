import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings as SettingsIcon, User, Shield, ArrowLeft, LogOut, MonitorX } from "lucide-react";
import { getAdminSidebarSections } from "@/lib/admin-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AppSidebar from "@/components/AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { updatePassword, terminateSessionsByRole } from "@/lib/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const BULK_SESSION_ROLES: { role: "patient" | "rd" | "doctor"; label: string }[] = [
  { role: "patient", label: "Patients" },
  { role: "rd", label: "Dietitians" },
  { role: "doctor", label: "Doctors" },
];

const AdminSettings = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [terminatingRole, setTerminatingRole] = useState<string | null>(null);

  const handleTerminateByRole = async (role: "patient" | "rd" | "doctor", label: string) => {
    setTerminatingRole(role);
    try {
      const result = await terminateSessionsByRole(role);
      toast.success(`Logged out all ${label.toLowerCase()} — ${result.count} session(s) terminated`);
    } catch (err: any) {
      toast.error(err.message || `Failed to terminate ${label.toLowerCase()} sessions`);
    } finally {
      setTerminatingRole(null);
    }
  };

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

  const bottomContent = (
    <button
      onClick={handleLogout}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-red-400 hover:bg-red-500/10 transition-all duration-150"
    >
      <LogOut className="w-[18px] h-[18px] shrink-0" />
      <span>Sign Out</span>
    </button>
  );

  const sidebarSections = getAdminSidebarSections();

  return (
    <div className="flex min-h-screen">
      <AppSidebar
        title="DietByRD"
        subtitle={user?.name || "Admin Panel"}
        sections={sidebarSections}
        bottomContent={bottomContent}
      />

      <main className="flex-1 min-w-0 bg-background">
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

          {/* Bulk Session Control */}
          <div className="bg-card rounded-xl border p-6">
            <div className="flex items-center gap-3 mb-2">
              <MonitorX className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">Bulk Session Control</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Force-logout every active session for an entire role, across all devices, in one click.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {BULK_SESSION_ROLES.map(({ role, label }) => (
                <AlertDialog key={role}>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive" disabled={terminatingRole === role}>
                      <LogOut className="w-4 h-4" />
                      {terminatingRole === role ? "Terminating..." : `Logout All ${label}`}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Logout all {label.toLowerCase()}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This immediately terminates every active session for every {label.toLowerCase().slice(0, -1)} account.
                        They will all be signed out and need to log in again. This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => handleTerminateByRole(role, label)}
                      >
                        Yes, logout all {label.toLowerCase()}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ))}
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
