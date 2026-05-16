import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import AppSidebar from "@/components/AppSidebar";
import { Users, Stethoscope, UtensilsCrossed, BarChart3, UserPlus, UserCheck, Loader2, LogOut, Settings, Tag, Plus, Copy, Check, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { getAdminSidebarSections } from "@/lib/admin-sidebar";

interface StaffMember {
  id: number;
  phone: string;
  name: string | null;
  role: string;
  password: string | null;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
}

interface PasswordVisibility {
  [id: number]: boolean;
}

interface CreateAccountResponse {
  id: number;
  phone: string;
  password: string;
  role: string;
}

const SupportTeamPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [createdAccount, setCreatedAccount] = useState<CreateAccountResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [listPasswordVisible, setListPasswordVisible] = useState<PasswordVisibility>({});

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // Fetch Support Team members
  const { data: supportTeam = [], isLoading, refetch } = useQuery<StaffMember[]>({
    queryKey: ["staff", "support_intern"],
    queryFn: async () => {
      const res = await fetch("/api/admin/staff/support_intern");
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data;
    },
  });

  // Create account mutation
  const createAccountMutation = useMutation({
    mutationFn: async (data: { phone: string; name: string }) => {
      const res = await fetch("/api/admin/staff/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: data.phone, name: data.name, role: "support_intern" }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (data) => {
      setCreatedAccount(data);
      setPhone("");
      setName("");
      refetch();
      toast.success("Support team account created successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create account");
    },
  });

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    
    const digits = phone.replace(/\D/g, "");
    if (digits.length !== 10) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }

    if (!name.trim()) {
      toast.error("Please enter a name");
      return;
    }

    createAccountMutation.mutate({ phone: digits, name: name.trim() });
  };

  const handleCopyCredentials = () => {
    if (!createdAccount) return;
    const credentials = `Phone: ${createdAccount.phone}\nPassword: ${createdAccount.password}`;
    navigator.clipboard.writeText(credentials);
    setCopied(true);
    toast.success("Credentials copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyPasswordOnly = () => {
    if (!createdAccount) return;
    navigator.clipboard.writeText(createdAccount.password);
    setCopiedPassword(true);
    toast.success("Password copied to clipboard!");
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  const toggleListPassword = (id: number) => {
    setListPasswordVisible(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCloseSuccess = () => {
    setCreatedAccount(null);
    setShowCreateDialog(false);
    setCopied(false);
    setShowPassword(false);
  };

  const sidebarSections = getAdminSidebarSections();

  const bottomContent = (
    <button
      onClick={handleLogout}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-red-400 hover:bg-red-500/10 transition-all duration-150"
    >
      <LogOut className="w-[18px] h-[18px] shrink-0" />
      <span>Sign Out</span>
    </button>
  );

  return (
    <div className="flex min-h-screen">
      <AppSidebar title="DietByRD" subtitle="Admin Panel" sections={sidebarSections} bottomContent={bottomContent} />

      <main className="flex-1 bg-background">
        <div className="flex items-center justify-end px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-sidebar text-sidebar-primary-foreground flex items-center justify-center text-xs font-semibold">
              {user?.name?.split(" ").map(n => n[0]).join("") || "AD"}
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Support Team</h1>
              <p className="text-sm text-gray-500 mt-1">Manage support team accounts</p>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Account
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Active Support Team Members ({supportTeam.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {supportTeam.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No support team members found</p>
                ) : (
                  <div className="space-y-3">
                    {supportTeam.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">{member.name || "Not Set"}</p>
                          <p className="text-sm text-gray-500">{member.phone}</p>
                          {member.password && (
                            <div className="flex items-center gap-1 mt-1">
                              <p className="text-xs text-gray-400 font-mono">
                                Password: {listPasswordVisible[member.id] ? member.password : "••••••••"}
                              </p>
                              <button
                                type="button"
                                onClick={() => toggleListPassword(member.id)}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                {listPasswordVisible[member.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              </button>
                            </div>
                          )}
                          {member.last_login_at && (
                            <p className="text-xs text-gray-400 mt-1">
                              Last login: {new Date(member.last_login_at).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${member.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                            {member.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Create Account Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Support Team Account</DialogTitle>
            <DialogDescription>
              Enter the phone number for the new support team account. A random 8-digit password will be generated.
            </DialogDescription>
          </DialogHeader>

          {!createdAccount ? (
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input
                  type="text"
                  placeholder="Full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Phone Number</label>
                <Input
                  type="tel"
                  placeholder="10-digit phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={10}
                  required
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createAccountMutation.isPending}>
                  {createAccountMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
                <p className="text-sm font-medium text-green-900">Account created successfully!</p>
                
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Phone Number</p>
                    <p className="font-mono font-medium">{createdAccount.phone}</p>
                  </div>
                  
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Password</p>
                    <div className="flex items-center gap-2">
                      <p className="font-mono font-medium">
                        {showPassword ? createdAccount.password : "••••••••"}
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleCopyCredentials} className="flex-1" variant="outline">
                    {copied ? (
                      <><Check className="w-4 h-4 mr-2" />Copied!</>
                    ) : (
                      <><Copy className="w-4 h-4 mr-2" />Copy All</>
                    )}
                  </Button>
                  <Button onClick={handleCopyPasswordOnly} className="flex-1" variant="outline">
                    {copiedPassword ? (
                      <><Check className="w-4 h-4 mr-2" />Copied!</>
                    ) : (
                      <><Copy className="w-4 h-4 mr-2" />Copy Password</>
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleCloseSuccess}>
                  Done
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupportTeamPage;
