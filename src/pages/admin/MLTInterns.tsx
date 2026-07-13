import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import AppSidebar from "@/components/AppSidebar";
import { Users, Stethoscope, UtensilsCrossed, BarChart3, UserPlus, UserCheck, Loader2, LogOut, Settings, Tag, Plus, Copy, Check, Eye, EyeOff, KeyRound, Trash2, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { getAdminSidebarSections } from "@/lib/admin-sidebar";
import { getAuthHeaders } from "@/lib/api";

interface StaffMember {
  id: number;
  phone: string;
  name: string | null;
  role: string;
  plain_password: string | null;
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

const MLTInternsPage = () => {
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
  const [resetPasswordTarget, setResetPasswordTarget] = useState<StaffMember | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);
  const resetPasswordInputRef = useRef<HTMLInputElement | null>(null);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // Fetch MLT Interns
  const { data: interns = [], isLoading, refetch } = useQuery<StaffMember[]>({
    queryKey: ["staff", "mlt_intern"],
    queryFn: async () => {
      const res = await fetch("/api/admin/staff/mlt_intern", { headers: getAuthHeaders() });
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
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ phone: data.phone, name: data.name, role: "mlt_intern" }),
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
      toast.success("MLT Intern account created successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create account");
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: number; password: string }) => {
      const res = await fetch(`/api/admin/staff/${userId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ new_password: password }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      refetch();
      toast.success("Password updated successfully");
      setResetPasswordTarget(null);
      setNewPassword("");
      setShowNewPassword(false);
    },
    onError: (err: Error) => toast.error(err.message || "Failed to update password"),
  });

  const deleteInternMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await fetch(`/api/admin/staff/${userId}`, { method: "DELETE", headers: getAuthHeaders() });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (_data, userId) => {
      queryClient.setQueryData(["staff", "mlt_intern"], (old) => {
        if (!Array.isArray(old)) return old;
        return old.filter((intern: StaffMember) => intern.id !== userId);
      });
      queryClient.invalidateQueries({ queryKey: ["staff", "mlt_intern"] });
      toast.success("MLT Intern deleted");
      setDeleteTarget(null);
    },
    onError: (err: Error) => toast.error(err.message || "Failed to delete intern"),
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
      <AppSidebar title="DietByRD" subtitle={user?.name || "Admin Panel"} sections={sidebarSections} bottomContent={bottomContent} />

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
              <h1 className="text-2xl font-bold text-gray-900">MLT Interns</h1>
              <p className="text-sm text-gray-500 mt-1">Manage MLT intern accounts</p>
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
                <CardTitle>Active MLT Interns ({interns.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {interns.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No MLT interns found</p>
                ) : (
                  <div className="space-y-3">
                    {interns.map((intern) => (
                      <div key={intern.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">{intern.name || "Not Set"}</p>
                          <p className="text-sm text-gray-500">{intern.phone}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <p className="text-xs text-gray-400 font-mono">
                              Password:{" "}
                              {intern.plain_password
                                ? listPasswordVisible[intern.id] ? intern.plain_password : "••••••••"
                                : "—"}
                            </p>
                            {intern.plain_password && (
                              <button
                                type="button"
                                onClick={() => toggleListPassword(intern.id)}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                {listPasswordVisible[intern.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              </button>
                            )}
                          </div>
                          {intern.last_login_at && (
                            <p className="text-xs text-gray-400 mt-1">
                              Last login: {new Date(intern.last_login_at).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${intern.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                            {intern.is_active ? "Active" : "Inactive"}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setResetPasswordTarget(intern); setNewPassword(""); setShowNewPassword(false); }}
                          >
                            <KeyRound className="w-3 h-3 mr-1" />
                            Reset PW
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive border-destructive/30 hover:bg-destructive/10"
                            onClick={() => setDeleteTarget(intern)}
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Delete
                          </Button>
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

      {/* Reset Password Dialog */}
      <Dialog open={!!resetPasswordTarget} onOpenChange={(open) => !open && setResetPasswordTarget(null)}>
        <DialogContent
          className="sm:max-w-sm"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            resetPasswordInputRef.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for {resetPasswordTarget?.name || resetPasswordTarget?.phone}.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newPassword.length >= 6 && resetPasswordTarget && !resetPasswordMutation.isPending) {
                resetPasswordMutation.mutate({ userId: resetPasswordTarget.id, password: newPassword });
              }
            }}
          >
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">New Password</label>
                <div className="relative">
                  <Input
                    ref={resetPasswordInputRef}
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Min. 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pr-10"
                    autoFocus
                  />
                  <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setResetPasswordTarget(null)}>Cancel</Button>
              <Button
                type="submit"
                disabled={newPassword.length < 6 || resetPasswordMutation.isPending}
              >
                {resetPasswordMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <KeyRound className="w-4 h-4 mr-2" />}
                Save Password
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Intern Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" /> Delete MLT Intern
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name || deleteTarget?.phone}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteInternMutation.isPending}
              onClick={() => deleteTarget && deleteInternMutation.mutate(deleteTarget.id)}
            >
              {deleteInternMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Account Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create MLT Intern Account</DialogTitle>
            <DialogDescription>
              Enter the phone number for the new MLT intern account. A random 8-digit password will be generated.
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

export default MLTInternsPage;
