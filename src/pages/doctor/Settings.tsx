import { useNavigate } from "react-router-dom";
import { Settings as SettingsIcon, User, Bell, Shield, ArrowLeft, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import AppSidebar from "@/components/AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { UserPlus, Users, BarChart3 } from "lucide-react";

const DoctorSettings = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const sidebarSections = [
    {
      title: "Workspace",
      items: [
        { label: "Refer Patient", href: "/doctor", icon: UserPlus },
        { label: "My Patients", href: "/doctor/patients", icon: Users },
        { label: "Analytics", href: "/doctor/analytics", icon: BarChart3 },
      ],
    },
    {
      title: "Settings",
      items: [
        { label: "Settings", href: "/doctor/settings", icon: SettingsIcon },
      ],
    },
  ];

  return (
    <div className="flex min-h-screen">
      <AppSidebar
        title="DietByRD"
        subtitle="Doctor Portal"
        sections={sidebarSections}
      />

      <main className="flex-1 bg-background">
        <div className="px-6 py-4 border-b flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/doctor")}>
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
              <h2 className="font-semibold">Profile Settings</h2>
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
                <label className="text-sm font-medium">Clinic Name</label>
                <Input placeholder="Your clinic name" />
              </div>
            </div>
          </div>

          {/* Notifications Section */}
          <div className="bg-card rounded-xl border p-6">
            <div className="flex items-center gap-3 mb-6">
              <Bell className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">Notifications</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">Referral Updates</div>
                  <div className="text-xs text-muted-foreground">Get notified when patients are assigned</div>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">Patient Progress</div>
                  <div className="text-xs text-muted-foreground">Weekly patient progress summaries</div>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">WhatsApp Notifications</div>
                  <div className="text-xs text-muted-foreground">Receive updates via WhatsApp</div>
                </div>
                <Switch />
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
                <Input type="password" placeholder="••••••••" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">New Password</label>
                <Input type="password" placeholder="••••••••" />
              </div>
              <Button size="sm">Update Password</Button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-card rounded-xl border border-destructive/20 p-6">
            <h2 className="font-semibold text-destructive mb-4">Danger Zone</h2>
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

export default DoctorSettings;
